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

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
};

/*const sendVerifyMail = async (username, email, user_id) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 456,
            secure: false,
            auth: {
                user: process.env.BREVO_MAIL,
                pass: process.env.BREVO_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        const mailOptions = {
            from: process.env.BREVO_MAIL,
            to: email,
            subject: 'For verification mail',
            html: `<p>Hi ${username}, please click here to <a href="http://localhost:3000/verify?id=${user_id}">Verify</a> your mail.</p>`
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log("Email has been sent", info.response);
            }
        });
    } catch (error) {
        console.log(error.message);
    }
};*/

const sendOtpMail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 456,
            auth: {
                user: process.env.BREVO_MAIL,
                pass: process.env.BREVO_PASS
            },
            secure:false,
            tls: {
                rejectUnauthorized: false
            }
        });
        const mailOptions = {
            from: process.env.BREVO_MAIL,
            to: email,
            subject: 'Your OTP code',
            text:` Your OTP code is ${otp}. It is valid for 1 minutes.`
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log("OTP email has been sent", info.response);
            }
        });
    } catch (error) {
        console.log(error.message);
    }
};

const loadRegister = async (req, res) => {
    try {
        res.render('user/signup');
    } catch (error) {
        console.log(error.message);
    }
};

const loadProduct = async (req, res) => {
    try {
        const currentDate = new Date();

        const products = await Product.find({ softDelete: false }).populate('category');

        const updatedProducts = products.map(product => {
            let finalPrice = product.price; 
            let isOnOffer = false; 
            let bestOffer = 0; 
            let offerType = ''; 

            const categoryOffer = product.category?.offer || 0;
            
            if (
                product.offer > 0 &&
                currentDate >= product.offerStart &&
                currentDate <= product.offerEnd
            ) {
                const productDiscount = (product.price * product.offer) / 100;
                finalPrice = product.price - productDiscount; 
                bestOffer = product.offer; 
                offerType = 'Product Offer'; 
                isOnOffer = true; 
            }

            if (
                categoryOffer > 0 &&
                currentDate >= product.category.offerStart &&
                currentDate <= product.category.offerEnd &&
                categoryOffer > bestOffer 
            ) {
                const categoryDiscount = (product.price * categoryOffer) / 100;
                finalPrice = product.price - categoryDiscount; 
                bestOffer = categoryOffer; 
                offerType = 'Category Offer'; 
                isOnOffer = true; 
            }
            return {
                ...product._doc,
                finalPrice: finalPrice.toFixed(2), 
                isOnOffer,
                bestOffer,
                offerType
            };
        });

        const user = await User.findById(req.session.user_id);

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Product', url: '/product' }
        ];

        res.render('user/product', { 
            products: updatedProducts, 
            user, 
            breadcrumbs 
        });
    } catch (error) {
        console.error('Error loading products:', error.message);
        res.status(500).send('Server Error');
    }
};



const addAddressLoad = async (req, res, next) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById(userId);
        const breadcrumbs = [
            { name: "Home", url: "/" },
            { name: "Profile", url: "/userDetails" },
            { name: "Address", url: "/add-address" },
          ];
        res.render('user/add-address',{user:user,breadcrumbs});
    } catch (error) {
        console.error(error.message);
        next(error); 
    }
};
const addAddress = async (req, res, next) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById(userId);
        const { firstname, lastname, mobile, pincode, street, city, state, country } = req.body;
        const errors = {};
     
        if (!firstname) {
            errors.firstname = "Firstname is required";
        } else {
            const firstnameRegex = /^[A-Za-z]+$/;
            if (!firstnameRegex.test(firstname)) {
                errors.firstname = "Firstname must contain only alphabets";
            }
        }

        if (!lastname) {
            errors.lastname = "Lastname is required";
        } else {
            const lastnameRegex = /^[A-Za-z]+$/;
            if (!lastnameRegex.test(lastname)) {
                errors.lastname = "Lastname must contain only alphabets";
            }
        }

        if (!mobile) {
            errors.mobile = "Mobile number is required";
        } else {
            const mobileRegex = /^[0-9]{10}$/;
            if (!mobileRegex.test(mobile)) {
                errors.mobile = "Mobile number must be 10 digits";
            }
        }

        if (!pincode) {
            errors.pincode = "Pincode is required";
        } else {
            const pincodeRegex = /^[0-9]{6}$/;
            if (!pincodeRegex.test(pincode)) {
                errors.pincode = "Pincode must be 6 digits";
            }
        }
      if(!street){
        errors.street="Street name is required"
      }
       if(!city){
        errors.city="City name is required"
       }
        if (Object.keys(errors).length > 0) {
            return res.render('user/add-address', { user:user,
                errors, 
                firstname, 
                lastname, 
                mobile, 
                pincode, 
                street, 
                city,
                state,
                country
            });
        }

        let address = new Address({
            user: req.session.user_id,  
            fullname: `${firstname} ${lastname}`,
            mobile: mobile,
            pincode: pincode,
            street: street,
            city: city,
            state:state,
            country:country
           
        });
        await address.save();
        
      
        res.redirect('/showAddress');

    } catch (error) {
        console.error(error.message);
        next(error);
    }
};


const showAddress = async (req, res, next) => {
    try {
       
        const userId = req.session.user_id;

        if (!userId) {
           
            console.log('User is not defined');
            return res.redirect('/login');
        }

       
        const addresses = await Address.find({ user: userId });

     
        const user = await User.findById(userId);

        if (!user) {
            console.log('User not found');
            return res.redirect('/login');
        }

        const breadcrumbs = [
            { name: "Home", url: "/" },
            { name: "Profile", url: "/userDetails" },
            { name: "ShowAddress", url: "/showAddress" },
          ];
        res.render('user/showAddress', { addresses, user,breadcrumbs });

    } catch (error) {
        console.error('Error loading address page:', error.message);
        next(error);
    }
};


const loadEditAddress = async (req, res, next) => {
    try {
        const userId = req.session.user_id;
        const user=await User.findById(userId)
        const address = await Address.findById(req.params.id);
        if (!address) return res.status(404).send('Address not found.');
        const breadcrumbs = [
            { name: "Home", url: "/" },
            { name: "Profile", url: "/userDetails" },
            { name: "editAddress", url: "/edit-address" },
          ];
        res.render('user/edit-address', { address,user,breadcrumbs }); 
    } catch (error) {
        console.error(error.message);
        next(error);
    }
};

const updateAddress = async (req, res, next) => {
    try {
        const { firstname, lastname, mobile, pincode, street, city, state, country } = req.body;

      
        if (!firstname || !lastname || !mobile || !pincode || !street || !city || !state || !country) {
            return res.status(400).send('All fields are required.');
        }

        await Address.findByIdAndUpdate(req.params.id, {
            fullname: `${firstname} ${lastname}`,
            mobile,
            pincode,
            street,
            city,
            state,
            country
        });

        res.redirect('/showAddress');
    } catch (error) {
        console.error(error.message);
        next(error);
    }
};
const deleteAddress = async (req, res, next) => {
    try {
        await Address.findByIdAndDelete(req.params.id);
        res.redirect('/showAddress');
    } catch (error) {
        console.error(error.message);
        next(error);
    }
};
   
const insertUser = async (req, res) => {
    try {
        const { username, email, mobileno, password, passwordRe, referralCode } = req.body; 
        const errors = {};

       
        if (!username) {
            errors.username = "Username is required";
        } else {
            const usernameRegex = /^[A-Za-z]+$/;
            if (!usernameRegex.test(username)) {
                errors.username = "Username must contain only alphabets";
            }
        }

        if (!email) {
            errors.email = "Email is required";
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errors.email = "Invalid email format";
            }
        }

        if (!mobileno) {
            errors.mobileno = "Mobile number is required";
        } else {
            const mobileRegex = /^[0-9]{10}$/;
            if (!mobileRegex.test(mobileno)) {
                errors.mobileno = "Mobile number must be 10 digits";
            }
        }

        if (!password) {
            errors.password = "Password is required";
        } else if (password.length < 5 || password.length > 8) {
            errors.password = "Password must be between 5 to 8 characters";
        }

        if (!passwordRe) {
            errors.passwordRe = "Please confirm your password";
        } else if (password !== passwordRe) {
            errors.passwordRe = "Passwords do not match";
        }

        if (Object.keys(errors).length > 0) {
            return res.render('user/signup', { errors, username, email, mobileno }); 
        }

        const spassword = await securePassword(password);
        const userReferal = generateRefferalCode();
        const userDatacheck = await User.findOne({ email });

        if (userDatacheck) {
            return res.render('user/signup', { message: "That user already exists! Try Again" });
        }

        const user = new User({
            username,
            email,
            mobileno,
            password: spassword,
            isAdmin: false,
            isVerified: false,
            referralCode: userReferal || null
        });

        const userData = await user.save();
        const userId = userData._id;

        const wallet = new Wallet({ userId: userData._id, amount: 0 });
        await wallet.save();

       
        if (referralCode) {
            const refferee = await User.findOne({ referralCode });
            if (refferee) {
                const refereeWallet = await Wallet.findOne({ userId: refferee._id });
                const referralBonus = 100;  
                refereeWallet.amount += referralBonus;
                refereeWallet.transactions.push({
                    type: 'Referral',
                    amount: referralBonus,
                });
                await refereeWallet.save();
            } else {
                return res.render("user/signup", {
                    message: "Referral code not valid",
                    count: 0,
                });
            }
        }
        
        const otp = generateOtp();
        const otpData = new OtpData({ userId, otp });
        await otpData.save(); 
        sendOtpMail(userData.email, otp);

        res.redirect(`/verify-otp?user_id=${userId}`); 
    } catch (error) {
        console.error(error.message);
        res.render('user/signup', { message: "An error occurred during registration. Please try again." });
    }
};

const updateUsersWithReferralCode = async () => {
    try {
        
        await User.updateMany(
            { referralCode: null }, 
            { $set: { referralCode: "NEW_REFERRAL_CODE" } } 
        );
        console.log("Updated users with null referralCode field.");
       
    } catch (error) {
        console.error("Error updating users:", error);
    }
};


updateUsersWithReferralCode();



function generateRefferalCode (){
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    let result = '';
      for (let i = 0; i < 6; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
  }
const resendOTP = async (req, res) => {
    try {
        const { user_id } = req.query;

        const userData = await User.findById(user_id);
        if (!userData) {
            return res.json({ success: false, message: "User not found" });
        }

        const newOtp = generateOtp();
        await OtpData.findOneAndUpdate({ userId: user_id }, { otp: newOtp });

        sendOtpMail(userData.email, newOtp);

        res.json({ success: true, message: "OTP resent successfully. Please check your email." });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "An error occurred while resending OTP. Please try again." });
    }
};




const verifyOtp = async(req,res)=>{
    try {
        const {user_id,otp}= req.body
         const otpdata= await OtpData.findOne({userId:user_id})
         console.log(otpdata) 
         if(otp===otpdata.otp){
             await User.findByIdAndUpdate(user_id,{$set:{isVerified:true}})
            res.redirect('/login')
            console.log("sucess")
         }else{
            res.render('user/verify-otp',{message:"Incorrect OTP entered. Please try again",user_id})
            console.log("error")
         }
        
    } catch (error) {
        console.log(error.message)
    }
}



const generateOtp = () => {
    return otpGenerator.generate(6, {
        digits: true,
        upperCaseAlphabets: false,
        specialChars: false,
        lowerCaseAlphabets: false 
    });
};

const otp = generateOtp();
console.log(otp);

const loginLoad = async (req, res) => {
    try {
        res.render('user/login',{user:req.session.user});
    } catch (error) {
        console.log(error.message);
    }
};
const verifyOtpLoad = async (req, res) => {
    try {
        
        const user=req.query.user_id;
        res.render('user/verify-otp',{message:"Enter the otp send to your email",user_id:user});
    } catch (error) {
        console.log(error.message);
    }
};

const verifyLogin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        console.log(email, password);
        const userData = await User.findOne({ email: email,isAdmin: false  });

        if (userData) {
            if (userData.isBlocked) {
                return res.render('user/login', { message: "Your account has been blocked by the admin" });
            }

            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (passwordMatch) {
                req.session.user_id = userData._id;
                
                return res.redirect('/');
            } else {
                return res.render('user/login', { message: "Email and password are incorrect" });
            }
        } else {
            return res.render('user/login', { message: "Email and password are incorrect" });
        }
    } catch (error) {
        console.log(error.message);
        return res.render('user/login', { message: "An error occurred. Please try again later." });
    }
}




const loadHome = async (req, res) => {
    try {
        const today = new Date();

        const products = await Product.find({ softDelete: false }).populate('category').limit(8);

        const updatedProducts = products.map(product => {
            const { price, offer: productOffer, offerStart, offerEnd, category } = product;
            let finalPrice = price;
            let bestOffer = 0;
            let offerType = ''; 
            const calculateDiscount = (price, discount) => (price * discount) / 100;
            if (productOffer > 0 && today >= offerStart && today <= offerEnd) {
                const productDiscount = calculateDiscount(price, productOffer);
                finalPrice = price - productDiscount;
                bestOffer = productOffer;
                offerType = 'Product Offer';
            }
            if (
                category &&
                category.offer > 0 &&
                today >= category.offerStart &&
                today <= category.offerEnd &&
                category.offer > bestOffer
            ) {
                const categoryDiscount = calculateDiscount(price, category.offer);
                finalPrice = price - categoryDiscount;
                bestOffer = category.offer;
                offerType = 'Category Offer';
            }
            return {
                ...product._doc,
                finalPrice: finalPrice.toFixed(2), 
                isOnOffer: bestOffer > 0,
                bestOffer,
                offerType, 
            };
        });

        const user = await User.findById(req.session.user_id);

        if (!user) {
            return res.status(404).render('user/index', {
                product: updatedProducts,
                user: null,
            });
        }

        res.render('user/index', {
            product: updatedProducts,
            user,
        });
    } catch (error) {
        console.error('Error loading home page:', error.message);
        res.status(500).send('Server Error');
    }
};





const loadProductdetail = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById(userId);
        const productId = req.params.id;

        console.log('Requested Product ID:', productId);

        const product = await Product.findById(productId).populate('category'); 
        if (!product) {
            console.log('Product not found');
            return res.status(404).send('Product not found');
        }

        const today = new Date();
        let finalPrice = product.price;
        let bestOffer = 0;
        let offerType = ''; 

        const calculateDiscount = (price, discount) => (price * discount) / 100;

        if (product.offer > 0 && today >= product.offerStart && today <= product.offerEnd) {
            const productDiscount = calculateDiscount(product.price, product.offer);
            finalPrice = product.price - productDiscount;
            bestOffer = product.offer;
            offerType = 'Product Offer'; 
        }
        const category = product.category;
        if (
            category &&
            category.offer > 0 &&
            today >= category.offerStart &&
            today <= category.offerEnd &&
            category.offer > bestOffer
        ) {
            const categoryDiscount = calculateDiscount(product.price, category.offer);
            finalPrice = product.price - categoryDiscount;
            bestOffer = category.offer;
            offerType = 'Category Offer'; 
        }

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Products', url: '/product' },
            { name: product.name, url: `/product/${productId}` },
        ];

        console.log('Product found:', product);

        res.render('user/productdetail', {
            product: {
                ...product._doc,
                finalPrice: finalPrice.toFixed(2), 
                isOnOffer: bestOffer > 0,
                bestOffer, 
                offerType, 
            },
            user,
            breadcrumbs,
        });

    } catch (error) {
        console.error('Error loading product detail:', error.message);
        res.status(500).send('Server Error');
    }
};



const addToCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const productId = req.params.productId;
        const { size, quantity } = req.body;

        const MAX_QUANTITY_PER_USER = 10;

        if (!userId) {
            return res.status(401).json({ message: 'User not logged in' });
        }

        if (!size || !quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Size and valid quantity are required' });
        }

        const product = await Product.findById(productId).populate('category');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const today = new Date();
        let finalPrice = product.price;

        const productOfferValid = product.offer > 0 && today >= product.offerStart && today <= product.offerEnd;
        const productOfferPrice = productOfferValid ? product.price - (product.price * product.offer) / 100 : product.price;

        const categoryOfferValid = product.category?.offer > 0;
        const categoryOfferPrice = categoryOfferValid ? product.price - (product.price * product.category.offer) / 100 : product.price;

        finalPrice = Math.min(productOfferPrice, categoryOfferPrice);

        const selectedSize = product.sizes.find(s => s.size === size);
        if (!selectedSize) {
            return res.status(400).json({ message: 'Selected size not available' });
        }

        if (quantity > selectedSize.stock) {
            return res.status(400).json({ message: `Only ${selectedSize.stock} units of this size are available.` });
        }

        let cart = await Cart.findOne({ userId, active: true });
        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        const productIndex = cart.products.findIndex(
            p => p.productId.toString() === productId && p.size === size
        );
        let currentQuantity = 0;

        if (productIndex > -1) {
            currentQuantity = cart.products[productIndex].quantity;
        }

        const totalQuantity = currentQuantity + quantity;
        if (totalQuantity > MAX_QUANTITY_PER_USER) {
            return res.status(400).json({ 
                message: `You can only add up to ${MAX_QUANTITY_PER_USER} units of this product.` 
            });
        }

        if (productIndex > -1) {
            cart.products[productIndex].quantity = totalQuantity;
            cart.products[productIndex].price = finalPrice; 
        } else {
            const productImage = product.images.length > 0 ? product.images[0].url : '';
            cart.products.push({
                productId: product._id,
                quantity,
                size,
                name: product.name,
                price: finalPrice,  
                images: productImage,
            });
        }

        await cart.save();

        const cartItemCount = cart.products.reduce((total, product) => total + product.quantity, 0);

        const wishList = await WishList.findOne({ userId });
        if (wishList) {
            const wishListIndex = wishList.products.findIndex(item => item.productId.toString() === productId);
            if (wishListIndex !== -1) {
                wishList.products.splice(wishListIndex, 1);
                await wishList.save();
            }
        }

        res.status(200).json({
            message: 'Product added to cart and removed from wishlist.',
            cartItemCount
        });

    } catch (error) {
        console.error('Error adding product to cart:', error.message);
        res.status(500).json({ message: 'Error adding product to cart' });
    }
};






const updateCartQuantity = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const productId = req.params.productId;
        const { size, change } = req.body;

        const MAX_QUANTITY_PER_USER = 10;

        if (!userId) {
            return res.status(401).json({ message: 'User not logged in' });
        }

       
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const productIndex = cart.products.findIndex(p => p.productId.equals(productId) && p.size === size);

        if (productIndex === -1) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        const product = cart.products[productIndex];
        const newQuantity = product.quantity + change;

        if (newQuantity < 1) {
            return res.status(400).json({ message: 'Quantity cannot be less than 1' });
        }

      
        const productDetails = await Product.findById(productId);

        if (!productDetails) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const sizeDetails = productDetails.sizes.find(s => s.size === size);

        if (!sizeDetails) {
            return res.status(404).json({ message: 'Size not found' });
        }

        
        if (newQuantity > sizeDetails.stock) {
            return res.status(400).json({ message: `Only ${sizeDetails.stock} units available for size ${size}` });
        }

        
        if (newQuantity > MAX_QUANTITY_PER_USER) {
            return res.status(400).json({ message: `Cannot add more than ${MAX_QUANTITY_PER_USER} units` });
        }

       
        cart.products[productIndex].quantity = newQuantity;

      
        await cart.save();

        res.json({ success: true, message: 'Quantity updated successfully' });
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};




const removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const productId = req.params.productId;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        let cart = await Cart.findOne({ userId, active: true });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const productIndex = cart.products.findIndex(p => p.productId.toString() === productId);

        if (productIndex > -1) {
           
            cart.products.splice(productIndex, 1);
            await cart.save();
            return res.status(200).json({ success: true, message: 'Product removed from cart', cart });
        } else {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

    } catch (error) {
        console.error('Error removing product from cart:', error.message);
        res.status(500).json({ success: false, message: 'Error removing product from cart' });
    }
};


const viewCart = async (req, res) => {
    try {
        const userId = req.session.user_id; 
        
        const user = await User.findById(userId);
        const cart = await Cart.findOne({ userId });
        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'product', url: '/product' },
            { name: 'Cart', url: '/cart' }  
        ];
        res.render('user/cart', { cart,user,breadcrumbs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching cart details' });
    }
};

const userLogout= async(req,res)=>{
    try {
        const userId=req.session.user_id;
        await User.findByIdAndUpdate(userId,{$set:{loggedIn:false}});

        req.session.destroy((err)=>{
            if(err)throw err;
              res.redirect("/")
         })
        
    } catch (error) {
   console.log(error.message)        
    }
}
const forgetLoad = async (req, res) => {
    try {
        res.render('user/forget');
    } catch (error) {
        console.log(error.message);
    }
};

const checkoutLoad = async (req, res) => {
    try {
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





const forgetVerify = async (req, res) => {
    try {
        const email=req.body.email;
        const userData= await User.findOne({email:email})
        if(userData){
          
           if(userData.isVerified===0){
            res.render('user/forget',{message:"Please verify your mail"})
           }else{
            const randomString=randomstring.generate();
            const updatedData= await User.updateOne({email:email},{$set:{token:randomString}})
            sendResetPasswordMail(userData.username,userData.email,randomString)
            res.render('user/forget',{message:"Please check your mail to reset your password"})
           }
        }else{
            res.render('user/forget',{message:"User email is incorrect"})
        }
    } catch (error) {
        console.log(error.message);
    }
};

const sendResetPasswordMail = async (username, email,token) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 456,
            secure: false,
            auth: {
                user: process.env.BREVO_MAIL,
                pass: process.env.BREVO_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        const mailOptions = {
            from: process.env.BREVO_MAIL,
            to: email,
            subject: 'For Reset Password',
            html: `<p>Hi ${username}, please click here to <a href="http://localhost:3000/forget-password?token=${token}">Reset</a> your password.</p>`
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log("Email has been sent", info.response);
            }
        });
    } catch (error) {
        console.log(error.message);
    }
};
const forgetPasswordLoad = async(req,res)=>{
    try {
        const token= req.query.token;
        const tokenData= await User.findOne({token:token});
        if(tokenData){
            res.render('user/forget-password',{user_id:tokenData._id})
        }else{
            res.render('user/404',{message:"Token is invalid"})
        }
    } catch (error) {
        console.log(error.message);
        
        
    }
}
const resetPassword=async(req,res)=>{
    try {
        const password=req.body.password
        const user_id=req.body.user_id
        const secure_password = await securePassword(password)
        const updatedData= await User.findByIdAndUpdate({_id:user_id},{$set:{password:secure_password,token:''}})
        res.redirect('/')
    } catch (error) {
     console.log(error.message)   
    }
}
const successGoogleLogin = async (req, res,next) => {
    try {
      if (!req.user) {
        res.render("user/login", { message: "failed to sing in with google" });
      }
      req.session.user;
      res.redirect("/");
    } catch (error) {
      next(error);
    }
  };
const errorlogin = async (req, res) => {
   
    return res.send("An error occurred during login.");
};

const getUserDetails = async (req, res, next) => {
    try {
        console.log('Session User ID:', req.session.user_id);
        const userId = req.session.user_id;
        
        if (!userId) {
            console.log('User is not defined');
            return res.redirect('/login');
        }

        const user = await User.findById(userId); 
        if (!user) {
            console.log('User not found');
            return res.redirect('/login');
        }
        let wallet = await Wallet.findOne({ userId: user._id });
        if (!wallet) {
            wallet = new Wallet({ 
                userId: user._id, 
                amount: 0,
                transactions: [] 
            });
            await wallet.save();
        }
        

        
        const breadcrumbs = [
            { name: "Home", url: "/" },
            { name: "Profile", url: "/userDetails" },
        ];

        res.render('user/userDetails', { user, breadcrumbs, wallet }); 
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).redirect('/login'); 
    }
};



const editProfileLoad = async (req, res, next) => {
    try {
        
        const userId = req.session.user_id;
        if (!userId) {
            console.log('User is not defined');
            return res.redirect('/login');
        }

        
        const user = await User.findById(userId);
        const breadcrumbs = [
            { name: "Home", url: "/" },
            { name: "Profile", url: "/userDetails" },
            { name: "EditProfile", url: "/editProfile" },
          ];
        if (user) {
            
            res.render('user/editProfile', { user, errors: null, message: null ,breadcrumbs});
        } else {
            console.log('User not found');
            return res.redirect('/login');
        }
    } catch (error) {
        console.error('Error loading edit profile page:', error.message);
        res.status(500).send('Server Error');
    }
};
const editProfile = async (req, res, next) => {
    try {
      
        const userId = req.session.user_id;
        if (!userId) {
            console.log('User is not defined');
            return res.redirect('/login');
        }

        
        const { username, email, mobileno } = req.body;

        
        const errors = {};
        if (!username || username.trim() === '') errors.username = { msg: 'Username is required' };
        if (!email || email.trim() === '') errors.email = { msg: 'Email is required' };
        if (!mobileno || mobileno.trim() === '') errors.mobileno = { msg: 'Mobile number is required' };

        
        if (Object.keys(errors).length > 0) {
            const user = await User.findById(userId);
            return res.render('user/editProfile', { user, errors, message: 'Please fix the errors' });
        }
        

        
        await User.findByIdAndUpdate(userId, {
            username,
            email,
            mobileno,
        }, { new: true }); 

        const breadcrumbs = [
            { name: "Home", url: "/" },
            { name: "Profile", url: "/userDetails" },
            { name: "EditProfile", url: "/editProfile" },
          ];
        res.redirect('/userDetails');
    } catch (error) {
        console.error('Error updating user profile:', error.message);
        res.status(500).send('Server Error');
    }
};


const getChangePasswordPage = async (req, res) => {
    try {
       
        const userId = req.session.user_id;

        if (!userId) {
            
            return res.redirect('/login');
        }

    
        const user = await User.findById(userId);

        if (!user) {
         
            return res.redirect('/login');
        }

        
        res.render('user/changePassword', { user, message: null, errors: null });

    } catch (error) {
        console.error('Error loading change password page:', error.message);
        res.status(500).send('Server Error');
    }
};
const changePassword = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

       
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/login');
        }

       
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.render('user/changePassword', {user,
                message: 'Current password is incorrect.',
                errors: null,
            });
        }

      
        if (newPassword !== confirmPassword) {
            return res.render('user/changePassword', {user,
                message: 'New password and confirm password do not match.',
                errors: null,
            });
        }

     
        if (newPassword.length < 6) {
            return res.render('user/changePassword', {
                message: 'New password must be at least 6 characters long.',
                errors: null,
            });
        }

    
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        
        user.password = hashedPassword;
        await user.save();

       
        res.redirect('/userDetails'); 
    } catch (error) {
        console.error('Error changing password:', error.message);
        res.status(500).send('Server Error');
    }
};
const generateOrderId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); 
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



const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, total } = req.body;

        if (!req.session.user_id) {
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        const userId = req.session.user_id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID format" });
        }

        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(404).render('404', { url: req.originalUrl, message: 'Address not valid', isLoggedIn: false, count: 0 });
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
            couponDiscount: req.body.couponDiscount,
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
                res.status(200).json({
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
            const wallet = await Wallet.findOne({ userId });

            wallet.amount -= total;
            await wallet.save();

            payment.status = 'paid';
            await payment.save();

            await Cart.deleteOne({ userId });
            return res.json({ success: true, message: "Order placed successfully with Wallet" });
        } else {
            return res.status(400).json({ success: false, message: "Invalid payment method selected" });
        }
    } catch (error) {
        console.error("Error placing order:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
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


const requestCancellation = async (req, res) => {
    const { orderId, reason } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        order.status = 'Cancellation Requested';
        order.cancelReason = reason;

        if (order.paymentMethod === 'Razorpay') {
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

        res.json({ success: true, message: 'Cancellation request has been sent for admin approval.' });
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

const wishlistLoad = async (req, res) => {
    const userId = req.session.user_id;

    if (!userId) {
        return res.redirect('/login?login_required=true');
    }

    try {
       
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).send('Unauthorized: User not logged in');
        }

     
        const wishList = await WishList.findOne({ userId }).populate({
            path: 'products.productId',
            populate: {
                path: 'category',
                model: 'Category'
            }
        });

        if (!wishList) {
            console.log("No wishlist found for this user.");
            return res.render('user/wishlist', { wishList: [], user });
        }

        
        const currentDate = new Date();

     
        const updatedWishList = wishList.products.map(({ productId }) => {
            let finalPrice = productId.price;
            let isOnOffer = false;
            let bestOffer = 0;
            let offerType = '';

          
            if (
                productId.offer > 0 &&
                currentDate >= productId.offerStart &&
                currentDate <= productId.offerEnd
            ) {
                const productDiscount = (productId.price * productId.offer) / 100;
                finalPrice = productId.price - productDiscount;
                bestOffer = productId.offer;
                offerType = 'Product Offer';
                isOnOffer = true;
            }

          
            const categoryOffer = productId.category?.offer || 0;
            if (
                categoryOffer > 0 &&
                productId.category?.offerStart &&
                productId.category?.offerEnd &&
                currentDate >= productId.category.offerStart &&
                currentDate <= productId.category.offerEnd &&
                categoryOffer > bestOffer
            ) {
                const categoryDiscount = (productId.price * categoryOffer) / 100;
                finalPrice = productId.price - categoryDiscount;
                bestOffer = categoryOffer;
                offerType = 'Category Offer';
                isOnOffer = true;
            }

            return {
                ...productId._doc,
                finalPrice: parseFloat(finalPrice.toFixed(2)),
                isOnOffer,
                bestOffer,
                offerType
            };
        });

        res.render('user/wishlist', { wishList: updatedWishList, user });
    } catch (error) {
        console.error("Error loading wishlist:", error.message);
        res.status(500).send('Server Error');
    }
};


const searchProduct = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById(userId);
        const categories = await Category.find();

        const searchQuery = req.query.search || '';
        const sortOption = req.query.sort || '';
        const category = req.query.category || '';

        const query = {
            $and: [
                {
                    $or: [
                        { name: { $regex: searchQuery, $options: 'i' } },
                        { color: { $regex: searchQuery, $options: 'i' } }
                    ]
                },
                { softDelete: false }
            ]
        };

        if (category) {
            const categories = await Category.find({
                name: { $in: category.split(",") },
            });
            const categoryIds = categories.map((cat) => cat._id);
            query.category = { $in: categoryIds };
        }

        let sort = {};
        switch (sortOption) {
            case 'popularity':
                sort = { popularity: 1 };
                break;
            case 'price_low_high':
                sort = { price: 1 };
                break;
            case 'price_high_low':
                sort = { price: -1 };
                break;
            case 'average_ratings':
                sort = { rating: -1 };
                break;
            case 'featured':
                sort = { featured: -1 };
                break;
            case 'new_arrivals':
                sort = { createdAt: -1 };
                break;
            case 'a_to_z':
                sort = { name: 1 };
                break;
            case 'z_to_a':
                sort = { name: -1 };
                break;
            default:
                sort = { name: 1 };
        }

        const products = await Product.find(query).sort(sort).collation({ locale: 'en', strength: 1 }).populate('category');

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Product', url: '/product' },
            { name: 'ProductSearch', url: '/searchProduct' }
        ];

        res.render('user/searchProduct', { products, breadcrumbs, user });
    } catch (err) {
        console.error("Error in searchProduct:", err);
        res.status(500).send('Server Error');
    }
};




const addTowishlist = async (req, res) => {
    try {
        const userId = req.session.user_id; 
        const { productId } = req.body; 
      
        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required.' });
        }

      
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        
        let wishlist = await WishList.findOne({ userId });
        if (!wishlist) {
            wishlist = new WishList({ userId, products: [] });
        }

        
        const existingProduct = wishlist.products.find(item => item.productId.toString() === productId);
        if (existingProduct) {
            return res.status(400).json({ message: 'Product already in wishlist.' });
        }

        
        wishlist.products.push({ productId });
        await wishlist.save();

       
        const wishlistCount = wishlist.products.length;

      
        res.status(201).json({ 
            message: 'Product added to wishlist!', 
            wishlist, 
            wishlistCount 
        });
    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).json({ message: 'Server error.' });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required.' });
        }

        const wishList = await WishList.findOne({ userId });
        if (!wishList || !wishList.products) {
            return res.status(404).json({ message: 'Wishlist not found or empty.' });
        }

       
        const productIndex = wishList.products.findIndex(item => item.productId.toString() === productId);
        if (productIndex === -1) {
            return res.status(404).json({ message: 'Product not found in wishlist.' });
        }

      
        const cart = await Cart.findOne({ userId });
        if (cart && cart.products) {
            const productInCartIndex = cart.products.findIndex(item => item.productId.toString() === productId);

            if (productInCartIndex !== -1) {
               
                return res.status(400).json({ message: 'Product is already in the cart. It will be removed from wishlist.' });
            }
        }

        wishList.products.splice(productIndex, 1);
        await wishList.save();

        return res.status(200).json({ message: 'Product removed from wishlist successfully.' });
    } catch (error) {
        console.error('Error removing product from wishlist:', error.message);
        return res.status(500).json({ message: 'Server error while removing product from wishlist.' });
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
        const shippingCharge = 100;
        
        doc.font('Helvetica-Bold').fontSize(12).text('Subtotal:', itemX, yPosition);
        doc.text(`${subtotal.toFixed(2)}`, totalX, yPosition);
        yPosition += 30;
        
        doc.font('Helvetica').fontSize(12).text('Discount:', itemX, yPosition);
        doc.text(` ${discount.toFixed(2)}`, totalX, yPosition);
        yPosition += 30;
        
        doc.font('Helvetica').fontSize(12).text('Shipping Charge:', itemX, yPosition);
        doc.text(`${shippingCharge.toFixed(2)}`, totalX, yPosition);
        yPosition += 30;
        
        const totalAmount = subtotal - discount + shippingCharge; 
        
        doc.font('Helvetica-Bold').fontSize(12).text('Total Amount:', itemX, yPosition);
        doc.text(`${totalAmount.toFixed(2)}`, totalX, yPosition);
        
        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        next(error);
    }
};


module.exports = {
    loadRegister,
    insertUser,
    loginLoad,
    verifyLogin,
    loadHome,
    verifyOtp,
    loadProduct,
    verifyOtpLoad,
    userLogout,
    resendOTP,
    viewCart,
    loadProductdetail,
    forgetLoad,
    forgetVerify,
    sendResetPasswordMail,
    forgetPasswordLoad,
    resetPassword,
    addToCart,
    checkoutLoad,
    addAddressLoad,
    addAddress,
    successGoogleLogin,
   errorlogin,
   updateCartQuantity ,
   removeFromCart,
   showAddress,
   loadEditAddress,
   updateAddress,
   deleteAddress,
   getUserDetails,
   editProfile,
   editProfileLoad,
   getChangePasswordPage,
    changePassword,
    placeOrder,
    orderLoad,
    paymentProcess,
    searchProduct,
    addTowishlist,
    wishlistLoad,
    removeFromWishlist,
    validateCoupon,
    returnOrder,
    requestCancellation,
    downloadInvoice,
    payAgain
    
    
};