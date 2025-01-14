const User = require('../model/userSchema');
const OtpData =require('../model/otpSchema')
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const session = require('express-session');
const otpGenerator = require('otp-generator');
const bodyParser = require('body-parser');
const Product=require('../model/productSchema')
const Cart=require('../model/cartSchema')
const randomstring=require('randomstring')
const Address=require('../model/addressSchema')
const Order=require('../model/orderSchema')
const Category=require('../model/categorySchema')
const WishList=require('../model/wishlistSchema')
const Payment=require('../model/paymentSchema')
const Coupon=require('../model/couponSchema')
const Wallet=require('../model/walletSchema')
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const mongoose=require('mongoose')
const { getTestError } = require("razorpay/dist/utils/razorpay-utils");
const Razorpay = require("razorpay");
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

const checkoutLoad = async (req, res) => {
    try {
       
        if (req.user) {
            req.session.user_id = req.user._id; 
        }

        const userId = req.session.user_id; 
        const user = await User.findById(userId);
        
        if (!userId) {
            return res.status(404).render('user/404', {
                url: req.originalUrl,
                message: 'Please login to view the checkout page',
                count: 0
            });
        }

        let userCart = await Cart.findOne({ userId, active: true })
            .populate({
                path: 'products.productId',
                populate: {
                    path: 'category', 
                    model: 'Category'
                }
            })
            .lean();

        if (!userCart) {
            return res.status(404).render('user/404', {
                url: req.originalUrl,
                message: 'Cart not found',
                count: 0
            });
        }

        const today = new Date();
        const calculateDiscount = (price, discount) => (price * discount) / 100;
        let offerDiscount = 0; 

        const subtotal = userCart.products.reduce((total, product) => {
            let productPrice = product.productId.price;
            let bestDiscountAmount = 0; 
            let bestOfferType = ''; 
            
            if (
                product.productId.offer > 0 && 
                today >= new Date(product.productId.offerStart) && 
                today <= new Date(product.productId.offerEnd)
            ) {
                const productDiscountAmount = calculateDiscount(productPrice, product.productId.offer);
                bestDiscountAmount = productDiscountAmount; 
                bestOfferType = 'Product Offer'; 
            }

            const category = product.productId.category;
            if (
                category &&
                category.offer > 0 &&
                today >= new Date(category.offerStart) &&
                today <= new Date(category.offerEnd)
            ) {
                const categoryDiscountAmount = calculateDiscount(productPrice, category.offer);

                if (categoryDiscountAmount > bestDiscountAmount) {
                    bestDiscountAmount = categoryDiscountAmount;
                    bestOfferType = 'Category Offer'; 
                }
            }

            const finalPrice = productPrice - bestDiscountAmount;
            product.finalPrice = finalPrice;
            product.offerType = bestOfferType;
            offerDiscount += bestDiscountAmount * product.quantity;
            const productTotal = finalPrice * product.quantity;

            return total + productTotal; 
        }, 0);

        const shippingCharge = 100; 
        const total = subtotal + shippingCharge ; 

        const addresses = await Address.find({ user: userId }); 

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Shop', url: '/product' },
            { name: 'Cart', url: '/cart' },
            { name: 'Checkout', url: '/checkout' }
        ];

        res.render('user/checkout', {
            cart: userCart,
            subtotal,
            shippingCharge,
            total,
            offerDiscount, 
            addresses,
            user,
            breadcrumbs
        });

        console.log('Cart data:', userCart);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).render('user/500');
    }
};

const validateCoupon = async (req, res,next) => {
    try {
      const { couponCode } = req.body;
      console.log(couponCode, "code");
      const coupon = await Coupon.findOne({
        code: { $regex: new RegExp(couponCode, "i") },
      });
  
      if (!coupon) {
        return res.status(404).json({ error: "Coupon not found." });
      }
  
      if (new Date() > new Date(coupon.expirityDate)) {
        return res.status(400).json({ error: "Coupon has expired." });
      }
  
      const discountAmount = coupon.maxDiscount;
      console.log(coupon.maxDiscount, "coupon code");
      res.json({ valid: true, discountAmount });
    } catch (error) {
      console.error(error.message);
      next(error)
    }
  };
  const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, total, couponDiscount } = req.body;

        if (!req.session.user_id) {
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        const userId = req.session.user_id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID format" });
        }

        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not valid' });
        }

        const userCart = await Cart.findOne({ userId });
        if (!userCart || !userCart.products || userCart.products.length === 0) {
            return res.status(400).json({ success: false, message: "User cart is empty" });
        }

        const productsWithPricing = [];
        let totalDiscount = 0;

        for (const item of userCart.products) {
            const product = await Product.findById(item.productId);
            if (product) {
                const productPrice = product.price;
                const discount = productPrice - item.price;

                productsWithPricing.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    size: item.size,
                    discount: discount,
                    price: productPrice,
                });

                totalDiscount += discount * item.quantity;
            }
        }

        const codLimit = 1000;

        
        if (paymentMethod === "COD" && total > codLimit) {
            return res.status(400).json({ success: false, message: `COD is not allowed for orders above Rs ${codLimit}.` });
        }

        
        if (paymentMethod === "Wallet") {
            const wallet = await Wallet.findOne({ userId });
            if (!wallet || wallet.amount < total) {
                return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
            }
        }

        const orderId = generateOrderId();
        const order = new Order({
            orderId,
            userId,
            addressId,
            products: productsWithPricing,
            totalAmount: total,
            discount: totalDiscount,
            couponDiscount,
            paymentMethod,
            status: "Ordered",
        });

        await order.save();

    
        const payment = new Payment({
            orderId: order._id,
            paymentMethod,
            amount: total,
            status: "pending",
        });
        await payment.save();

        order.paymentId = payment._id;
        await order.save();



        if (paymentMethod === "COD") {
            
            await Cart.deleteOne({ userId });
            return res.json({ success: true, message: "Order placed successfully with COD" });

        } else if (paymentMethod === "Razorpay") {
            const options = {
                amount: total * 100, 
                currency: "INR",
                receipt: payment._id.toString(),
                notes: { orderId },
            };

            razorpayInstance.orders.create(options, async (err, razorpayOrder) => {
                if (err) {
                    console.error("Error creating Razorpay order:", err);
                    return res.status(400).json({ success: false, message: "Failed to create Razorpay order" });
                }

    
                await Cart.deleteOne({ userId });

                return res.status(200).json({
                    success: true,
                    message: "Razorpay order created successfully",
                    order_id: razorpayOrder.id,
                    amount: options.amount / 100, 
                    key_id: RAZORPAY_ID_KEY,
                    contact: address.mobile,
                    name: address.fullname,
                    email: address.email,
                    db_order_id: order._id,
                });
            });

        } else if (paymentMethod === "Wallet") {
            try {
                const wallet = await Wallet.findOne({ userId });

                
                if (wallet.amount < total) {
                    return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
                }

                
                wallet.amount -= total;

                
                const walletTransaction = {
                    type: 'WalletPayment',
                    amount: total,
                    date: new Date(),
                };

                wallet.transactions.push(walletTransaction);

                await wallet.save();

                payment.status = 'paid';
                await payment.save();

            
                await Cart.deleteOne({ userId });

                return res.json({ success: true, message: "Order placed successfully with Wallet" });

            } catch (error) {
                console.error("Error placing order with wallet payment:", error.message);
                res.status(500).json({ success: false, message: "Internal server error" });
            }
        } else {
            return res.status(400).json({ success: false, message: "Invalid payment method" });
        }

    } catch (error) {
        console.error("Error placing order:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

        
const paymentProcess = async (req, res) => {
    try {
        const { paymentId, success, orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Order ID is required' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const payment = await Payment.findOne({ orderId: order._id });
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment record not found' });
        }

        if (success === true) {
            payment.status = 'paid';
            order.status = 'Ordered';
        } else {
            payment.status = 'failed';
            order.status = 'Failed';
        }

        await payment.save();
        await order.save();

        return res.status(200).json({ success: true, message: 'Payment status updated' });
    } catch (error) {
        console.error('Error processing payment:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const payAgain = async (req, res) => {
    const { id: orderId } = req.params; 
    const userId = req.session.user_id;

    console.log('Attempting to pay again for orderId:', orderId);

    if (!userId) {
        console.log('User not logged in.');
        return res.status(401).json({ success: false, message: 'User not logged in.' });
    }

    try {
        const order = await Order.findOne({ orderId });
        console.log('Fetched order:', order);

        if (!order || order.status !== 'Failed') {
            return res.status(400).json({ success: false, message: 'Order not found or cannot be paid again.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const options = {
            amount: order.totalAmount * 100, 
            currency: "INR",
            receipt: orderId,
        };

        const razorpayOrder = await razorpayInstance.orders.create(options);
        console.log('Razorpay order created:', razorpayOrder);

        res.json({
            success: true,
            key_id: RAZORPAY_ID_KEY,
            order_id: razorpayOrder.id,
            amount: order.totalAmount * 100,
            name: user.username,
            email: user.email,
            contact: user.mobileno,
            db_order_id: order._id 
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ success: false, message: 'Failed to create payment order.' });
    }
};

const generateOrderId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); 
};
const orderLoad = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById(userId);

        if (!userId) {
            return res.status(404).render('user/404', {
                url: req.originalUrl,
                message: 'Please login to view your orders',
                count: 0
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 3;
        const skip = (page - 1) * limit;

        let orders;
        let totalOrders = 0;

        if (req.params.id) {
            
            orders = await Order.find({ userId })
                .populate('products.productId', 'name')
                .populate('addressId', 'street city pincode')
                .sort({ createdAt: -1 })  
                .skip(skip)
                .limit(limit)
                .exec();

            if (!orders || orders.length === 0) {
                return res.status(404).render('error', {
                    url: req.originalUrl,
                    message: 'Order not found',
                    count: 0
                });
            }

            totalOrders = orders.length;
        } else {
            
            totalOrders = await Order.countDocuments({ userId });

            orders = await Order.find({ userId })
                .populate('products.productId')
                .populate('addressId')
                .populate('paymentId', 'status')
                .sort({ createdAt: -1 })  
                .skip(skip)
                .limit(limit)
                .exec();
        }

        const totalPages = Math.ceil(totalOrders / limit);

        console.log('Fetched Orders:', orders);

        const breadcrumbs = [
            { name: "Home", url: "/" },
            { name: "Profile", url: "/userDetails" },
            { name: "Orders", url: "/orders" }
        ];

        res.render('user/orders', {
            orders,
            user,
            breadcrumbs,
            currentPage: page,
            totalPages: totalPages,
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('user/500', {
            url: req.originalUrl,
            message: 'Internal Server Error',
            count: 0
        });
    }
};


const cancelOrder = async (req, res) => {
    const { orderId } = req.body;

    try {
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

                if (order.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'This order has already been canceled.' });
        }
       
        order.status = 'Cancelled';

        if (order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Wallet') {
            const user = await User.findById(order.userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }

            const wallet = await Wallet.findOne({ userId: user._id }) || new Wallet({ userId: user._id, amount: 0 });

            wallet.amount += order.totalAmount;

            wallet.transactions.push({
                type: 'OrderRefund',
                amount: order.totalAmount,
                date: new Date(),
            });

            await wallet.save();
            console.log(`Credited ${order.totalAmount} to wallet of user ${user._id}`);
        }

        await order.save();

        res.json({ success: true, message: 'Your order has been canceled and the refund processed.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'An error occurred while processing your request.' });
    }
};


const returnOrder = async (req, res) => {
    try {
        const { reason, orderId } = req.body;

        if (!reason || !orderId) {
            return res.status(400).json({ success: false, message: 'Invalid input' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.status !== 'Delivered') {
            return res.status(400).json({ success: false, message: 'Order cannot be returned' });
        }

        order.status = 'Returned';
        order.returnReason = reason;
        await order.save();

        const wallet = await Wallet.findOneAndUpdate(
            { userId: order.userId },
            { 
                $inc: { amount: order.totalAmount }, 
                $push: { transactions: { type: 'OrderRefund', amount: order.totalAmount } },
                modifiedOn: Date.now()
            },
            { upsert: true, new: true } 
        );

        console.log(`Order ${orderId} returned for reason: ${reason}, amount refunded to wallet.`);

        res.json({ success: true });
    } catch (error) {
        console.error('Error returning order:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

  const downloadInvoice = async (req, res, next) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId })
            .populate('products.productId') 
            .populate('addressId') 
            .exec();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.orderId}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Invoice Header
        doc.fontSize(15).text('Shoptrendz', { align: 'center' });
        doc.text('Shoptrendz | +012 345 67890 | shoptrendz@example.com', { align: 'center' });
        doc.moveDown().moveDown(); 

        const leftX = 50; 
        const rightX = 350; 
        const detailsY = 150; 

        doc.fontSize(12).text('Bill To:', leftX, detailsY, { underline: true }); 
        doc.fontSize(12).text(`${order.addressId.fullname}`, leftX, detailsY + 20); 
        doc.fontSize(12).text(`${order.addressId.street}, ${order.addressId.city}, ${order.addressId.state}, ${order.addressId.country}`, leftX, detailsY + 40); // Adjusted font size
        doc.fontSize(12).text(`${order.addressId.mobile || 'N/A'}`, leftX, detailsY + 60); 
        doc.moveDown();

        doc.fontSize(12).text(`Order Number: ${order.orderId}`, rightX, detailsY, { align: 'right' }); 
        doc.fontSize(12).text('Payment Status: Paid', rightX, detailsY + 20, { align: 'right' }); 

        const tableTop = 260;
        const itemX = 50; 
        const quantityX = 180;
        const priceX = 340; 
        const totalX = 490; 
        
        doc.font('Helvetica-Bold');
        doc.fontSize(12).text('Item', itemX, tableTop);
        doc.text('Quantity', quantityX, tableTop);
        doc.text('Unit Price (₹)', priceX, tableTop);
        doc.text('Total (₹)', totalX, tableTop);
        doc.moveTo(itemX, tableTop + 15).lineTo(totalX + 50, tableTop + 15).stroke();
        
        let yPosition = tableTop + 20;
        let subtotal = 0; 
        
        order.products.forEach(item => {
            const product = item.productId; 
            const quantity = item.quantity;
            const price = product.price || 0; 
            const total = price * quantity;
            subtotal += total;
        
            doc.font('Helvetica');
            doc.text(product.name || 'Unknown Item', itemX, yPosition);
            doc.text(quantity.toString(), quantityX, yPosition);
            doc.text(price.toFixed(2), priceX, yPosition);
            doc.text(total.toFixed(2), totalX, yPosition);
            yPosition += 30; 
        });
        
        doc.moveTo(itemX, yPosition + 10).lineTo(totalX + 50, yPosition + 10).stroke();
        yPosition += 30;
        
        const discount = order.discount || 0; 
        const couponDiscount = order.couponDiscount || 0; 
        const shippingCharge = 100;
        
        doc.font('Helvetica-Bold').fontSize(12).text('Subtotal:', itemX, yPosition);
        doc.text(`${subtotal.toFixed(2)}`, totalX, yPosition);
        yPosition += 30;
        
        doc.font('Helvetica').fontSize(12).text('Discount:', itemX, yPosition);
        doc.text(`- ${discount.toFixed(2)}`, totalX, yPosition);
        yPosition += 30;
        
        doc.font('Helvetica').fontSize(12).text('Coupon Discount:', itemX, yPosition);
        doc.text(`- ${couponDiscount.toFixed(2)}`, totalX, yPosition);
        yPosition += 30;
        
        doc.font('Helvetica').fontSize(12).text('Shipping Charge:', itemX, yPosition);
        doc.text(`  ${shippingCharge.toFixed(2)}`, totalX, yPosition);
        yPosition += 30;
        
        const totalAmount = subtotal - discount - couponDiscount + shippingCharge;
        
        doc.font('Helvetica-Bold').fontSize(12).text('Total Amount:', itemX, yPosition);
        doc.text(`${totalAmount.toFixed(2)}`, totalX, yPosition);
        
        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        next(error);
    }
};
const coupons= async (req, res) => {
    try {
      const coupons = await Coupon.find({
        expirityDate: { $gt: new Date() }, // Only show unexpired coupons
      }).select('code description'); // Selecting only the coupon code and description
  
      res.json(coupons); // Send coupons to the frontend
    } catch (error) {
      res.status(500).json({ message: 'Error fetching coupons' });
    }
  };
module.exports = {
    checkoutLoad,
    placeOrder,
    paymentProcess,
    payAgain,
    orderLoad,
    cancelOrder,
    returnOrder,
    validateCoupon,
    downloadInvoice,
    coupons
    
    
};