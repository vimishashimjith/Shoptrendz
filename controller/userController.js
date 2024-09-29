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
const Payment=require('../model/paymentSchema')
const Category=require('../model/categorySchema')

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
        
        const products = await Product.find({softDelete:false});

        
        const userId = req.session.user_id;
        const user = await User.findById(userId);

        
        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Product', url: '/product' }
        ];

        
        res.render('user/product', { products, user, breadcrumbs });
    } catch (error) {
        console.log(error.message);
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
        const { username, email, mobileno, password, passwordRe } = req.body;
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
                errors.mobileno = "Mobile number must contain number & be 10 digits";
            }
        }
        if (!password) {
            errors.password = "Password is required";
        } else if (password.length < 5 || password.length > 8) {
            errors.password = "Password must be between 5 to 8 characters";
        }

        if (!passwordRe) {
            errors.passwordRe = "Please confirm your password";
        }

        if (password && passwordRe && password !== passwordRe) {
            errors.passwordRe = "Passwords do not match";
        }
        if (Object.keys(errors).length > 0) {
            return res.render('user/signup', { errors, username, email, mobileno }); 
        }

       
        const spassword = await securePassword(password);

        const userDatacheck = await User.findOne({ email });
        if (userDatacheck) {
            return res.render('user/signup', { message: "That user already exists!!...Try Again" });
        }

        
        const user = new User({
            username,
            email,
            mobileno,
            password: spassword,
            isAdmin: false,
            isVerified: false
        });

        const userData = await user.save();
        const userId = userData._id;

        if (userData) {
            const otp = generateOtp();
            console.log(otp);

            const otpData = new OtpData({
                userId: userId,
                otp: otp
            });

            await otpData.save(); 
            sendOtpMail(userData.email, otp);

            res.redirect(`/verify-otp?user_id=${userId}`); 
        } else {
            res.render('user/signup', { message: "Your registration has failed" });
        }
    } catch (error) {
        console.log(error.message);
        res.render('user/signup', { message: "An error occurred during registration. Please try again." });
    }
};




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
      
        const products = await Product.find({ softDelete: false }).limit(8);

      
        const user = await User.findById(req.session.user_id); 
        
       
        res.render('user/index', {
            product: products,
            user: user
        });
        
      
        console.log(products);
    } catch (error) {
        console.log(error.message);
    }
};

const loadProductdetail = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById(userId);
        const productId = req.params.id;
        console.log('Requested Product ID:', productId);
        
        const product = await Product.findById(productId);
        if (!product) {
            console.log('Product not found');
            return res.status(404).send('Product not found');
        }
        const breadcrumbs = [  
      { name: "Home", url: "/" },
      { name: "Product", url: "/product" },
      { name: product.name, url: `/product/${productId}` },
    ];
        console.log('Product found:', product);
        res.render('user/productdetail',{product,user,breadcrumbs});
    } catch (error) {
        console.log(error.message);
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

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

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

        const productIndex = cart.products.findIndex(p => p.productId.toString() === productId && p.size === size);
        let currentQuantity = 0;

        if (productIndex > -1) {
            currentQuantity = cart.products[productIndex].quantity;
        }

        const totalQuantity = currentQuantity + quantity;
        if (totalQuantity > MAX_QUANTITY_PER_USER) {
            return res.status(400).json({ message: `You can only add up to ${MAX_QUANTITY_PER_USER} units of this product.` });
        }

        if (productIndex > -1) {
            cart.products[productIndex].quantity = totalQuantity;
        } else {
            const productImage = product.images.length > 0 ? product.images[0].url : '';
            cart.products.push({
                productId: product._id,
                quantity: quantity,
                size: size,
                name: product.name,
                price: product.price,
                images: productImage,
            });
        }

        await cart.save();

        
        const cartItemCount = cart.products.reduce((total, product) => total + product.quantity, 0);

        res.status(200).json({ message: 'Product added to cart', cartItemCount });
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
        const user= await User.findById(userId)
        if (!userId) {
            return res.status(401).render('error', {
                url: req.originalUrl,
                message: 'Please login to view the checkout page',
                count: 0
            });
        }

      
        let userCart = await Cart.findOne({ userId, active: true }).populate('products.productId').lean();

        if (!userCart) {
            return res.status(404).render('error', {
                url: req.originalUrl,
                message: 'Cart not found',
                count: 0
            });
        }

     
        const subtotal = userCart.products.reduce((total, item) => total + (item.productId.price * item.quantity), 0);

       
        const shippingCost = 50; 

      
        const total = subtotal + shippingCost;

      
        
        const addresses = await Address.find({ user: userId });
        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Shop', url: '/shop' },
            { name: 'Cart', url: '/cart' } ,
            {name:'checkout',url:'/checkout'}

        ];
        res.render('user/checkout', {
            cart: userCart,
            subtotal,
            shippingCost,
            total,
            addresses, 
            user,breadcrumbs
        });

        console.log('Cart data:', userCart);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Internal Server Error');
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
//Reset password//
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
        const breadcrumbs = [
            { name: "Home", url: "/" },
            { name: "Profile", url: "/userDetails" },
          ];
    
        res.render('user/userDetails', { user,breadcrumbs });
        
    } catch (error) {
        console.error('Error fetching user details:', error.message);
        res.status(500).send('Server Error');
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




const paymentProcess = async(req,res)=>{
    try{
      const { paymentId, success,orderId } = req.body;
      const userId =req.session.user_id 
      const paymentStatus = success ? 'paid' : 'failed';
      await Payment.findOneAndUpdate({orderId:orderId},{status:paymentStatus});
      console.log('payment status change',success);
      res.json({success:true});
  } catch (error) {
      console.error(`Error processing payment: ${error}`);
      res.json({ success: false });
    }
  };
  

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { addressId, paymentMethod } = req.body;

        // Validate input
        if (!userId || !addressId || !paymentMethod) {
            return res.status(400).send('Invalid input');
        }

        // Fetch user's cart
        const cart = await Cart.findOne({ userId, active: true }).populate('products.productId');
        if (!cart || cart.products.length === 0) {
            return res.status(404).send('Cart is empty or not found');
        }

        // Calculate total amount
        const totalAmount = cart.products.reduce((total, item) => total + (item.productId.price * item.quantity), 0);
        const orderId = generateOrderId(); // Unique order ID

        // Create a new order
        const newOrder = new Order({
            orderId,
            userId,
            addressId,
            products: cart.products.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity,
                size: item.size,
            })),
            totalAmount,
            paymentMethod,
            status: 'Pending'
        });

        // Save order to the database
        await newOrder.save();
        
        // Mark cart as inactive
        cart.active = false;
        await cart.save();
        await Cart.deleteOne({ _id: cart._id });

        // Handle Cash on Delivery (COD) payment
        if (paymentMethod === 'COD') {
            return res.json({
                success: true,
                message: 'Order placed successfully with Cash on Delivery.',
                orderId: newOrder.orderId
            });
        } else {
            // Handle online payment through Razorpay
            const razorpayOrder = await razorpayInstance.orders.create({
                amount: totalAmount * 100, // Amount in paise (₹1 = 100 paise)
                currency: 'INR',
                receipt: orderId,
                payment_capture: 1 // Auto capture after payment success
            });

            if (!razorpayOrder) {
                return res.status(500).send('Error creating Razorpay order');
            }

            // Return Razorpay order details to the frontend
            return res.json({
                success: true,
                razorpayOrderId: razorpayOrder.id,
                amount: totalAmount,
                currency: 'INR',
                orderId: newOrder.orderId
            });
        }
    } catch (error) {
        console.error('Error placing order:', error.message);
        return res.status(500).send('Internal Server Error');
    }
};
const shippingCharges = {
    // Define your specific state charges here
    'kerala':50,
    'tamilnadu':100,
    // Default shipping charge
    'Default': 50
};

const shippingCharge = async (req, res) => {
    try {
      const { addressId } = req.query;
      
      // Validate the addressId format (add your own validation logic)
      if (!mongoose.Types.ObjectId.isValid(addressId)) {
        return res.status(400).json({ error: 'Invalid address ID format.' });
      }
  
      const address = await Address.findById(addressId);
      if (!address) {
        return res.status(404).json({ error: 'Address not found.' });
      }
  
      const state = address.state;
      const shippingCharge = shippingCharges[state] || shippingCharges['Default'];
  
      res.json({ shippingCharge });
      console.log('Pass the shipping charge:', shippingCharge);
  
    } catch (error) {
      console.error('Server Error:', error.message);
      res.status(500).json({ error: 'Server Error' });
    }
  };
  


const orderLoad = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById(userId);

        if (!userId) {
            return res.status(401).render('error', {
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
           
            orders = await Order.find({ userId, orderId: req.params.id })
                .populate('addressId', 'street city pincode')
                .populate('products.productId', 'name')
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
        res.status(500).render('error', {
            url: req.originalUrl,
            message: 'Internal Server Error',
            count: 0
        });
    }
};


const cancelOrder= async (req, res) => {
    try {
        const { reason, orderId } = req.body;

       
        if (!reason || !orderId) {
            return res.status(400).json({ success: false, message: 'Invalid input' });
        }

       
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

    
        order.status = 'Cancelled';
        await order.save();

        
        console.log(`Order ${orderId} cancelled for reason: ${reason}`);

        res.json({ success: true });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};



const searchProduct= async (req, res) => {
    try {
const userId=req.session.user_id;
const user= await User.findById(userId) 

        const searchQuery = req.query.search || '';
        const sortOption = req.query.sort || '';

       
        const query = {
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { color: { $regex: searchQuery, $options: 'i' } }
            ]
        };
        

       
        let sort = {};
        switch (sortOption) {
            case 'popularity':
                sort = {popularity :1 };
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

  
        const products = await Product.find(query).sort(sort);
       
        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Product', url: '/product' },
            { name: 'ProductSearch', url: '/searchProduct' }
        ];
       
        res.render('user/searchProduct', { products,breadcrumbs,user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
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
    cancelOrder,
    paymentProcess,
    searchProduct
 

};
