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

       
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 8; 
        const skip = (page - 1) * limit; 

        
        const totalProducts = await Product.countDocuments({ softDelete: false });

        
        const products = await Product.find({ softDelete: false })
            .populate('category')
            .skip(skip)
            .limit(limit);

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

    
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('user/product', { 
            products: updatedProducts, 
            user, 
            breadcrumbs, 
            currentPage: page, 
            totalPages 
        });
    } catch (error) {
        console.error('Error loading products:', error.message);
        res.status(500).render('user/500');
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
        
        if (req.user) {
           
            req.session.user_id = req.user._id;
            return res.redirect('/'); 
        }

        
        const email = req.body.email;
        const password = req.body.password;
        console.log(email, password);

        const userData = await User.findOne({ email: email, isAdmin: false });

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
};






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
        
        if (req.user) {
            req.session.user_id = req.user._id; 
        }

        
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
const wallet = async (req, res) => {
    try {
        const userId = req.session.user_id;

        if (!userId) return res.redirect('/login');

        const user = await User.findById(userId);
        if (!user) return res.redirect('/login');

        let wallet = await Wallet.findOne({ userId: user._id });
        if (!wallet) {
            wallet = new Wallet({
                userId: user._id,
                amount: 0,
                transactions: [],
            });
            await wallet.save();
        }

        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit;

        // Map transactions to add 'transactionMode' for each
        const paginatedTransactions = wallet.transactions.slice(skip, skip + limit).map(transaction => {
            const transactionMode = 
                transaction.type === 'Referral' || transaction.type === 'OrderRefund' 
                    ? 'Credit' 
                    : 'Debit';
            return {
                ...transaction._doc, // Spread all fields of the transaction document
                transactionMode,     // Add transactionMode to indicate Credit or Debit
            };
        });

        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);

        const breadcrumbs = [
            { name: "Home", url: "/" },
            { name: "Profile", url: "/userDetails" },
            { name: "Wallet", url: "/wallet" },
        ];

        res.render('user/wallet', {
            user,
            breadcrumbs,
            wallet,
            transactions: paginatedTransactions,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error('Error fetching wallet details:', error);
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
        const currentPage = parseInt(req.query.page) || 1; 
        const productsPerPage = 12; 
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

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / productsPerPage);
        const products = await Product.find(query)
            .sort(sort)
            .collation({ locale: 'en', strength: 1 })
            .populate('category')
            .skip((currentPage - 1) * productsPerPage)
            .limit(productsPerPage);

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Product', url: '/product' },
            { name: 'ProductSearch', url: '/searchProduct' }
        ];

        res.render('user/searchProduct', {
            products,
            breadcrumbs,
            user,
            currentPage,
            totalPages,
            searchQuery,
            sortOption,
            category
        });
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
    loadProductdetail,
    forgetLoad,
    forgetVerify,
    sendResetPasswordMail,
    forgetPasswordLoad,
    resetPassword,
    addAddressLoad,
    addAddress,
    successGoogleLogin,
   errorlogin,
   showAddress,
   loadEditAddress,
   updateAddress,
   deleteAddress,
   getUserDetails,
   editProfile,
   editProfileLoad,
   getChangePasswordPage,
    changePassword,
    searchProduct,
    addTowishlist,
    wishlistLoad,
    removeFromWishlist ,
    wallet   
};