const bcrypt = require('bcrypt');
const User = require('../model/userSchema'); 
const Order = require('../model/orderSchema');
const Product = require('../model/productSchema');
const adminLayout = './layouts/auth/admin/authLayout.ejs';
const mongoose = require('mongoose');
const Coupon = require('../model/couponSchema'); 
const excel = require('exceljs'); 
const PDFDocument = require('pdfkit');
const stream = require('stream');
const Payment=require('../model/paymentSchema')

module.exports = {
    getAdminLogin: async (req, res) => {
        if (req.session.adminId) {
            return res.redirect('/admin/home');
        }

        res.render('admin/login', {
            title: 'Admin Page',
            layout: adminLayout
        });
    },

    verifyLogin: async (req, res) => {
        try {
            const { email, password } = req.body;
            const admin = await User.findOne({ email, isAdmin: true });

            if (admin) {
                const passwordMatch = await bcrypt.compare(password, admin.password);

                if (passwordMatch) {
                    req.session.adminId = admin._id;  // Set admin session ID
                    res.redirect("/admin/home");
                } else {
                    res.render('admin/login', { 
                        title: 'Admin Page', 
                        layout: adminLayout, 
                        message: "Email and password are incorrect" 
                    });
                }
            } else {
                res.render('admin/login', { 
                    title: 'Admin Page', 
                    layout: adminLayout, 
                    message: "Email and password are incorrect" 
                });
            }
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    loadDashboard: async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }
    
            const adminData = await User.findById(req.session.adminId);
            if (adminData && adminData.isAdmin) {
                // Total Sales Calculation
                const totalSales = await Order.aggregate([
                    { 
                        $group: {
                            _id: null, // No grouping, just get the total sum
                            totalSale: { $sum: "$totalAmount" }
                        }
                    }
                ]);
    
                // Total Products Calculation
                const totalProducts = await Product.countDocuments({ softDelete: false }); // Exclude soft deleted products
    
                // Total Users Calculation
                const totalUsers = await User.countDocuments({ isAdmin: false }); 
    
                // Top 10 Best-Selling Products
                const topSellingProducts = await Order.aggregate([
                    { $unwind: "$products" },
                    {
                        $group: {
                            _id: "$products.productId",
                            totalQuantity: { $sum: "$products.quantity" }
                        }
                    },
                    {
                        $lookup: {
                            from: "products", // Collection name
                            localField: "_id",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    { $unwind: "$productDetails" },
                    {
                        $project: {
                            _id: 0,
                            productId: "$_id",
                            productName: "$productDetails.name",
                            totalQuantity: 1,
                            price: "$productDetails.price",
                            images: "$productDetails.images" // Include images field here
                        }
                    },
                    { $sort: { totalQuantity: -1 } },
                    { $limit: 10 }
                ]);
    
                // Top 10 Best-Selling Categories
                const topSellingCategories = await Order.aggregate([
                    { $unwind: "$products" },
                    {
                        $lookup: {
                            from: "products", // Collection name
                            localField: "products.productId",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    { $unwind: "$productDetails" },
                    {
                        $group: {
                            _id: "$productDetails.category",
                            totalQuantity: { $sum: "$products.quantity" }
                        }
                    },
                    {
                        $lookup: {
                            from: "categories", // Collection name
                            localField: "_id",
                            foreignField: "_id",
                            as: "categoryDetails"
                        }
                    },
                    { $unwind: "$categoryDetails" },
                    {
                        $project: {
                            _id: 0,
                            categoryId: "$_id",
                            categoryName: "$categoryDetails.name",
                            totalQuantity: 1
                        }
                    },
                    { $sort: { totalQuantity: -1 } },
                    { $limit: 10 }
                ]);
    
                // Top 10 Best-Selling Brands
                const topSellingBrands = await Order.aggregate([
                    { $unwind: "$products" },
                    {
                        $lookup: {
                            from: "products", // Collection name
                            localField: "products.productId",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    { $unwind: "$productDetails" },
                    {
                        $group: {
                            _id: "$productDetails.brand",
                            totalQuantity: { $sum: "$products.quantity" }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            brandName: "$_id",
                            totalQuantity: 1
                        }
                    },
                    { $sort: { totalQuantity: -1 } },
                    { $limit: 10 }
                ]);
    
                // Render the dashboard with collected data
                res.render('admin/home', { 
                    title: 'Admin Home', 
                    layout: adminLayout, 
                    admin: adminData,
                    totalSale: totalSales.length > 0 ? totalSales[0].totalSale : 0,
                    totalProducts: totalProducts,
                    totalUsers: totalUsers,
                    topSellingProducts,
                    topSellingCategories,
                    topSellingBrands
                });
            } else {
                res.status(403).redirect('/admin/login');
            }
        } catch (error) {
            console.error('Error in loadDashboard:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },
    

    logout: async (req, res) => {
        try {
            req.session.destroy(err => {
                if (err) {
                    console.error('Error in logout:', err);
                    return res.status(500).send('Internal Server Error');
                }
                res.redirect('/admin/login');
            });
        } catch (error) {
            console.error('Error in logout:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },


    adminDashboard: async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }
    
            let search = req.query.search || '';
            const page = parseInt(req.query.page, 5) || 1;
            const limit = 5; 
            const skip = (page - 1) * limit; 
    
            const usersData = await User.find({
                isAdmin: false,
                $or: [
                    { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                    { email: { $regex: '.*' + search + '.*', $options: 'i' } }
                ]
            })
            .skip(skip) 
            .limit(limit); 
            const totalUsers = await User.countDocuments({
                isAdmin: false,
                $or: [
                    { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                    { email: { $regex: '.*' + search + '.*', $options: 'i' } }
                ]
            });
    
            const totalPages = Math.ceil(totalUsers / limit);
    
            res.render('admin/admin-users', { 
                title: 'Admin Users',
                layout: adminLayout,
                users: usersData,
                search: search,
                currentPage: page,
                totalPages: totalPages
            });
        } catch (error) {
            console.error('Error in adminDashboard:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },
    
    blockUser: async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }

            const userId = req.params.id;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).send("User not found");
            }

            user.isBlocked = !user.isBlocked;
            await user.save();

            res.redirect('/admin/admin-users');
        } catch (error) {
            console.error('Error in blockUser:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    loadOrderManagementPage: async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }
    
            const page = parseInt(req.query.page, 10) || 1; 
            const limit = 8;
            const skip = (page - 1) * limit;
    
            const totalOrders = await Order.countDocuments();
            const orders = await Order.find()
                .populate('userId', 'username email')
                .populate('addressId', 'street city zipcode')
                .populate('paymentId', 'status')
                .skip(skip)
                .limit(limit);
    
            const totalPages = Math.ceil(totalOrders / limit);
    
            res.render('admin/orderManagement', {
                title: 'Order Management',
                layout: adminLayout,
                orders,
                currentPage: page,
                totalPages
            });
        } catch (error) {
            console.error('Error in loadOrderManagementPage:', error.message);
            res.status(500).send('Internal Server Error');
        }
    },
    
    getOrderDetails: async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }
    
            const orderId = req.params.orderId;
    
            const order = await Order.findById(orderId)
                .populate('userId', 'username email')
                .populate({
                    path: 'products.productId',
                    select: 'name price'
                })
                .populate('addressId', 'street city pincode')
                .populate('paymentId', 'status');
    
           
            console.log('Order:', order);
    
            if (!order) {
                return res.status(404).send("Order not found");
            }
    
            
            console.log('Payment Status:', order.paymentId?.status);
    
            res.render('admin/orderDetails', {
                order,
                title: 'Order Details',
                layout: adminLayout
            });
        } catch (error) {
            console.error('Error in getOrderDetails:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },
    

   updateOrderStatus : async (req, res) => {
        try {
          if (!req.session.adminId) {
            return res.redirect('/admin/login');
          }
      
          const { orderId, status } = req.body;
          const validStatuses = ['Shipped', 'Out-For-Delivery', 'Delivered', 'Cancelled'];
      
          if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
          }
      
         
          const order = await Order.findById(orderId).populate('products.productId'); 
          if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
          }
      
          order.status = status;
          await order.save();
      
          
          if (status === 'Delivered') {
            for (const item of order.products) {
                const product = item.productId;
              
                if (product) {
                  console.log(`Product found: ${product.name}`);
              
                 
                  const sizeObj = product.sizes.find(s => s.size === item.size); 
              
                  if (sizeObj) {
                    console.log(`Size found: ${sizeObj.size}, Current stock: ${sizeObj.stock}, Ordered quantity: ${item.quantity}`);
              
                  
                    if (sizeObj.stock >= item.quantity) {
                      sizeObj.stock -= item.quantity; 
                      await product.save(); 
              
                      console.log(`Stock after update for size ${sizeObj.size}: ${sizeObj.stock}`);
                    } else {
                      console.error(`Not enough stock for Product: ${product.name}, Size: ${item.size}`);
                      return res.status(400).json({ success: false, message: `Not enough stock for ${product.name} (Size: ${item.size})` });
                    }
                  } else {
                    console.error(`Size ${item.size} not found for Product: ${product.name}`);
                    return res.status(400).json({ success: false, message: `Size ${item.size} not found for ${product.name}` });
                  }
                } else {
                  console.error(`Product not found for ID: ${item.productId}`);
                  return res.status(404).json({ success: false, message: 'Product not found' });
                }
            }}
              
          res.json({ success: true, message: 'Order status updated and stock decremented successfully' });
        } catch (error) {
          console.error('Error in updateOrderStatus:', error.message);
          res.status(500).json({ success: false, message: 'Server error' });
        }
      },
      
    cancelOrders: async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }

            const { ids } = req.body;

            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'No orders selected' });
            }

            const result = await Order.updateMany(
                { _id: { $in: ids } },
                { $set: { status: 'Cancelled' } }
            );

            res.json({ success: true, message: `${result.nModified} orders have been cancelled` });
        } catch (error) {
            console.error('Error in cancelOrders:', error.message);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },
    getCouponCodes: async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }

            const page = parseInt(req.query.page, 1) || 1;
            const limit = 10; 
            const skip = (page - 1) * limit;

            const couponCodes = await Coupon.find()
                .skip(skip)
                .limit(limit);

            const totalCoupons = await Coupon.countDocuments();

            const totalPages = Math.ceil(totalCoupons / limit);

            res.render('admin/coupon', {
                title: 'Coupon Codes',
                layout: adminLayout,
                coupons: couponCodes,
                currentPage: page,
                totalPages: totalPages,
            });
        } catch (error) {
            console.error('Error in getCouponCodes:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },
    addCouponLoad: (req, res) => {
      
        if (!req.session.adminId) {
            return res.redirect('/admin/login');
        }
        res.render('admin/addCoupon', {
            title: 'Add New Coupon',
            layout:adminLayout
            
        });
    },

    addCoupon: async (req, res) => {
        try {
            const { code, type, maxDiscount, description, limit, expiryDate } = req.body;

            const newCoupon = new Coupon({
                code,
                type,
                maxDiscount,
                description,
                limit,
                expirityDate: expiryDate
            });

            await newCoupon.save();

            req.flash('success', 'Coupon added successfully!');
            res.redirect('/admin/coupon'); 
        } catch (error) {
            console.error('Error adding coupon:', error.message);
            req.flash('error', 'Failed to add coupon. Please try again.');
            res.redirect('/admin/addCoupon'); 
    }
},
    removeCoupon: async (req, res) => {
        try {
          if (!req.session.adminId) {
            return res.redirect('/admin/login');
          }
      
          const couponId = req.params.id; 
          const coupon = await Coupon.findById(couponId);
      
          if (!coupon) {
            return res.status(404).redirect('/admin/coupons');
          }
      
          await Coupon.findByIdAndDelete(couponId); 
      
         
          res.redirect('/admin/coupon');
        } catch (error) {
          console.error('Error in removeCoupon:', error.message);
          res.status(500).redirect('/admin/coupons');
        }
      },
     SalesReport : async (req, res) => {
          try {
              const format = req.query.format;
      
              // Check for report generation format
              if (format === 'pdf') {
                  const doc = new PDFDocument();
                  res.setHeader('Content-disposition', 'attachment; filename=sales_report.pdf');
                  res.setHeader('Content-type', 'application/pdf');
      
                  // Create the PDF content
                  doc.fontSize(20).text('Sales Report', { align: 'center' }).moveDown();
                  doc.fontSize(14).text(`Total Sales: ₹${totalSales}`);
                  doc.text(`Total Orders: ${totalOrders}`);
                  doc.text(`Total Discounts: ₹${totalDiscount}`);
                  doc.moveDown();
      
                  // Add table headers
                  doc.fontSize(12).text('Buyer | Product Name | Quantity | Price | Total', { align: 'left', underline: true }).moveDown();
      
                  // Add order details
                  orders.forEach(orderItem => {
                      orderItem.products.forEach(product => {
                          const buyer = orderItem.userId ? orderItem.userId.username : 'Unknown User';
                          const totalAmount = orderItem.totalAmount;
                          const price = product.productId?.price || 0;
                          const quantity = product.quantity || 0;
                          doc.text(`${buyer} | ${product.productId?.name} | ${quantity} | ₹${price} | ₹${totalAmount}`);
                      });
                  });
      
                  // Finalize the PDF and send it to the client
                  doc.pipe(res);
                  doc.end();
                  return; // End the function after sending the PDF
              } else if (format === 'excel') {
                  // Implement Excel report generation logic here
                  res.status(501).send('Excel report generation not implemented yet.');
                  return;
              } else if (format) {
                  res.status(400).send('Invalid format');
                  return;
              }
      
              // Logic for fetching sales report data
              const page = parseInt(req.query.page) || 1;
              const limit = parseInt(req.query.limit) || 10;
              const skip = (page - 1) * limit;
              const search = req.query.search || '';
      
              const { startDate, endDate, presetFilter } = req.query;
              let dateFilter = {};
      
              // Determine date filter based on the preset filter or custom dates
              if (presetFilter === 'today') {
                  const today = new Date();
                  dateFilter = { orderDate: { $gte: today.setHours(0, 0, 0, 0) } };
              } else if (presetFilter === 'week') {
                  const today = new Date();
                  const dayOfWeek = today.getDay();
                  const startOfWeek = new Date(today);
                  startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                  dateFilter = { orderDate: { $gte: startOfWeek } };
              } else if (presetFilter === 'month') {
                  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                  dateFilter = { orderDate: { $gte: startOfMonth } };
              } else if (startDate && endDate) {
                  dateFilter = { orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) } };
              }
      
              const searchFilter = search
                  ? {
                      $or: [
                          { 'userId.username': { $regex: search, $options: 'i' } },
                          { 'products.productId.name': { $regex: search, $options: 'i' } }
                      ]
                  }
                  : {};
      
              // Fetch the orders with applied filters
              const orders = await Order.find({ ...searchFilter, ...dateFilter })
                  .populate('userId', 'username')
                  .populate('products.productId', 'name price')
                  .skip(skip)
                  .limit(limit);
      
              // Calculate totals
              const totalOrders = await Order.countDocuments({ ...searchFilter, ...dateFilter });
              const totalPages = Math.ceil(totalOrders / limit);
              
              let totalSales = 0;
              let totalDiscount = 0;
              let totalCouponDiscount = 0;
      
              orders.forEach(order => {
                  totalSales += order.totalAmount;
                  totalDiscount += order.discount || 0;
                  totalCouponDiscount += order.couponDiscount || 0;
              });
      
              // Render the sales report view
              res.render('admin/salesReport', {
                  orders, // Send the fetched orders to the view
                  admin: req.admin,
                  layout: adminLayout,
                  currentPage: page,
                  totalPages,
                  totalSales,
                  totalDiscount,
                  totalCouponDiscount,
                  totalOrders,
                  search,
                  limit
              });
          } catch (error) {
              console.error('Error fetching sales report:', error);
              res.status(500).send('Internal Server Error');
          }
      },
      
      salesData: async (req, res) => {
        const filter = req.query.filter || 'yearly';
        let dateRange = {};
        
        const now = new Date();
        switch (filter) {
            case 'yearly':
                dateRange = { $gte: new Date(now.getFullYear(), 0, 1), $lte: now };
                break;
            case 'monthly':
                dateRange = { $gte: new Date(now.getFullYear(), now.getMonth(), 1), $lte: now };
                break;
            case 'weekly':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay()); // Start of the week (Sunday)
                weekStart.setHours(0, 0, 0, 0);
                dateRange = { $gte: weekStart, $lte: now };
                break;
            case 'daily':
                dateRange = { $gte: new Date(now.setHours(0, 0, 0, 0)), $lte: now };
                break;
            default:
                return res.status(400).json({ error: "Invalid filter option" });
        }
    
        try {
            // Get total sales for the dashboard
            const totalSales = await Order.aggregate([
                { 
                    $group: {
                        _id: null, // No grouping, just get the total sum
                        totalSale: { $sum: "$totalAmount" }
                    }
                }
            ]);
    
            // Get orders based on the date range filter
            const orders = await Order.aggregate([
                { $match: { orderDate: dateRange } },
                { 
                    $group: {
                        _id: { 
                            $dateToString: { 
                                format: filter === 'yearly' ? "%Y" : 
                                        filter === 'monthly' ? "%Y-%m" : 
                                        filter === 'weekly' ? "%Y-%U" : 
                                        "%Y-%m-%d", 
                                date: "$orderDate" 
                            } 
                        },
                        totalSales: { $sum: "$totalAmount" } 
                    }
                },
                { $sort: { _id: 1 } }
            ]);
    
            // Map orders to include labels and values for the front-end chart
            const data = orders.map(order => ({
                label: order._id,
                value: order.totalSales
            }));
    
            // Pass the total sales and order data to the view
            res.render('admin/home', { totalSale: totalSales, salesData: data });
        } catch (error) {
            console.error("Error fetching sales data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    
    updateCancellationStatus : async (req, res) => {
        const { action, orderId } = req.body;
    
        if (!action || !orderId) {
            return res.status(400).json({ success: false, message: "Invalid request." });
        }
    
        try {
            
            const order = await Order.findById(orderId);
            
            if (!order) {
                return res.status(404).json({ success: false, message: "Order not found." });
            }
    
           
            if (action === 'Approve') {
                order.status = 'Cancelled'; 
                await order.save();
    
                
              
                return res.status(200).json({ success: true, message: "Cancellation request approved successfully." });
            } else if (action === 'Reject') {
                order.status = 'Active'; 
                await order.save();
    
                
               
                return res.status(200).json({ success: true, message: "Cancellation request rejected successfully." });
            } else {
                return res.status(400).json({ success: false, message: "Invalid action." });
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: "An error occurred while updating the cancellation status." });
        }
    },
    updatePaymentStatus: async (req, res) => {
        try {
            const orderId = req.query.id;
            const order = await Order.findById(orderId).populate('paymentId');
    
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
    
            const payment = order.paymentId;
            if (!payment) {
                return res.status(404).json({ success: false, message: 'Payment not found' });
            }
    
           
            payment.status = payment.status === 'pending' ? 'paid' : 'pending';
            await payment.save();
    
            console.log(`Payment status updated to: ${payment.status}`);
            res.redirect('/admin/orderManagement');
        } catch (error) {
            console.error('Error updating payment status:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },
      
      
    
    updateStatus: async (req, res) => {
        try {
            const { status, orderId } = req.body;
    
            const order = await Order.findByIdAndUpdate(
                orderId, 
                { $set: { status } }, 
                { new: true }
            ).populate('products.productId'); 
    
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
    
            
            if (status === 'Delivered') {
                for (const item of order.products) {
                    const product = await Product.findById(item.productId);
                    if (product) {
                        const sizeObj = product.sizes.find(s => s.size === item.size);
                        if (sizeObj) {
                            await Product.updateOne(
                                { _id: item.productId, 'sizes.size': item.size },
                                { $inc: { 'sizes.$.stock': -item.quantity } }
                            );
                        }
                    }
                }
            }
    
            res.json({ success: true, message: 'Order status updated successfully' });
        } catch (error) {
            console.error('Error updating order status:', error.message);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },    
}