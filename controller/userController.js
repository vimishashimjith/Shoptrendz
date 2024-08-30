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
const userLayout = './layouts/auth/admin/authLayout.ejs';

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
        const product= await Product.find();
        const userId = req.session.user_id;
        const user = await User.findById(userId);
       
        res.render('user/product',{product,user});
    } catch (error) {
        console.log(error.message);
    }
};
const addAddressLoad = async (req, res, next) => {
    try {
        const userId = req.session.user_id;
        const user = await Address.find({ user: userId });

        res.render('user/add-address',{user:user});
    } catch (error) {
        console.error(error.message);
        next(error); // Passes error to error-handling middleware
    }
};
const addAddress = async (req, res, next) => {
    try {
        const { firstname, lastname, mobile, pincode, street, city, state, country } = req.body;
        
        // Basic validation
        if (!firstname || !lastname || !mobile || !pincode || !street || !city || !state || !country) {
            return res.status(400).send('All fields are required.');
        }

        // Creating a new Address instance
        let address = new Address({
            user: req.session.user_id,  
            fullname: `${firstname} ${lastname}`,
            mobile: mobile,
            pincode: pincode,
            street: street,
            city: city,
            state: state,
            country: country
        });

      
        await address.save();

      
        res.redirect('showAddress');

    } catch (error) {
        console.error(error.message);
        next(error); 
    }
};
const showAddress = async (req, res, next) => {
    try {
        // Get the user ID from the session
        const userId = req.session.user_id;

        if (!userId) {
            // If the user is not logged in, redirect to the login page
            console.log('User is not defined');
            return res.redirect('/login');
        }

        // Fetch the addresses associated with the logged-in user
        const addresses = await Address.find({ user: userId });

        // Fetch user details for personalized display
        const user = await User.findById(userId);

        if (!user) {
            console.log('User not found');
            return res.redirect('/login');
        }

        // Render the showAddress page with the user's addresses and user details
        res.render('user/showAddress', { addresses, user });

    } catch (error) {
        console.error('Error loading address page:', error.message);
        next(error);
    }
};


const loadEditAddress = async (req, res, next) => {
    try {
        const address = await Address.findById(req.params.id);
        if (!address) return res.status(404).send('Address not found.');
        res.render('user/edit-address', { address }); // Make sure to create an 'edit-address.ejs' view
    } catch (error) {
        console.error(error.message);
        next(error);
    }
};

const updateAddress = async (req, res, next) => {
    try {
        const { firstname, lastname, mobile, pincode, street, city, state, country } = req.body;

        // Validation could be added here if necessary
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

        res.redirect('/showAddress'); // Redirect back to the addresses page
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




const resendOTP= async (req, res) => {
    try {
        const { user_id } = req.query;

        const userData = await User.findById(user_id);
        if (!userData) {
            return res.render('user/verify-otp', { message: "User not found" });
        }

        const newOtp = generateOtp();
        await OtpData.findOneAndUpdate({ userId: user_id }, { otp: newOtp });

        sendOtpMail(userData.email, newOtp);

        res.render('user/verify-otp', { user_id, message: "OTP resent successfully. Please check your email." });
    } catch (error) {
        console.log(error);
        res.render('error', { message: "An error occurred while resending OTP. Please try again." });
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
        const userData = await User.findOne({ email: email });

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
        
        const product= await Product.find()
        const user = await User.findById(req.session.user_id); 
        res.render('user/index',{product:product,user:user
            
        });
      
        console.log(product)
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

        console.log('Product found:', product);
        res.render('user/productdetail',{product,user});
    } catch (error) {
        console.error('Error loading product details:', error.message);
        res.status(500).send('Server Error');
    }
};



const addToCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
       
      
        const productId = req.params.productId;
        const { size, quantity } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'User not logged in' });
        }

        if (!size) {
            return res.status(400).json({ message: 'Size is required' });
        }

        if (!quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Valid quantity is required' });
        }

        let cart = await Cart.findOne({ userId, active: true });

        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        const productIndex = cart.products.findIndex(p => p.productId.toString() === productId);

        if (productIndex > -1) {
            cart.products[productIndex].quantity += quantity;
        } else {
            const product = await Product.findById(productId);
          
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const productImage = product.images.length > 0 ? product.images[0].url : '';
            cart.products.push({
                productId: product._id,
                quantity: quantity,
                size: size,
                name: product.name,
                price: product.price,
                images:productImage 
            
            });
        }

        await cart.save();
        res.status(200).json({ message: 'Product added to cart', cart });

    } catch (error) {
        console.error('Error adding product to cart:', error.message);
        res.status(500).json({ message: 'Error adding product to cart' });
    }
};


const updateCartQuantity = async (req, res) => {
    try {
        const userId = req.session.user_id; 
        const productId = req.params.productId;
        const { change } = req.body; 

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        if (!change || typeof change !== 'number') {
            return res.status(400).json({ success: false, message: 'Invalid quantity change' });
        }

        let cart = await Cart.findOne({ userId, active: true });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const productIndex = cart.products.findIndex(p => p.productId.toString() === productId);

        if (productIndex > -1) {
            
            cart.products[productIndex].quantity += change;

            if (cart.products[productIndex].quantity <= 0) {
              
                cart.products.splice(productIndex, 1);
            }

            await cart.save();
            return res.status(200).json({ success: true, message: 'Cart updated successfully', cart });
        } else {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

    } catch (error) {
        console.error('Error updating cart:', error.message);
        res.status(500).json({ success: false, message: 'Error updating cart' });
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

        res.render('user/cart', { cart,user });
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
        // Check if user is logged in
        const userId = req.session.user_id;
        const user= await User.findById(userId)
        if (!userId) {
            return res.status(401).render('error', {
                url: req.originalUrl,
                message: 'Please login to view the checkout page',
                count: 0
            });
        }

        // Fetch the active cart for the user
        let userCart = await Cart.findOne({ userId, active: true }).populate('products.productId').lean();

        if (!userCart) {
            return res.status(404).render('error', {
                url: req.originalUrl,
                message: 'Cart not found',
                count: 0
            });
        }

        // Calculate subtotal
        const subtotal = userCart.products.reduce((total, item) => total + (item.productId.price * item.quantity), 0);

        // Define shipping cost
        const shippingCost = 10; // You can adjust or calculate based on your logic

        // Calculate total amount
        const total = subtotal + shippingCost;

        // Retrieve any existing addresses for the user
        
        const addresses = await Address.find({ user: userId });
        // Render checkout page with populated cart data
        res.render('user/checkout', {
            cart: userCart,
            subtotal,
            shippingCost,
            total,
            addresses, // Pass addresses to the view
            user
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
        // Log session data for debugging
        console.log('Session User ID:', req.session.user_id);
        
        // Use the user_id directly from the session
        const userId = req.session.user_id;
        
        if (!userId) {
            // User is not logged in; redirect to login page
            console.log('User is not defined');
            return res.redirect('/login');
        }

        // Fetch user details from the database using userId
        const user = await User.findById(userId); // Assuming you have a User model

        if (!user) {
            console.log('User not found');
            return res.redirect('/login');
        }

        // Render the user details page with the user object
        res.render('user/userDetails', { user });
        
    } catch (error) {
        console.error('Error fetching user details:', error.message);
        res.status(500).send('Server Error');
    }
};


const editProfileLoad = async (req, res, next) => {
    try {
        // Check if the user is logged in
        const userId = req.session.user_id;
        if (!userId) {
            console.log('User is not defined');
            return res.redirect('/login');
        }

        // Fetch user details using the session user ID
        const user = await User.findById(userId);

        if (user) {
            // Render the edit profile page with user data
            res.render('user/editProfile', { user, errors: null, message: null });
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
        // Check if the user is logged in
        const userId = req.session.user_id;
        if (!userId) {
            console.log('User is not defined');
            return res.redirect('/login');
        }

        // Extract the updated profile data from the request body
        const { username, email, mobileno } = req.body;

        // Validate the data (basic example, expand as needed)
        const errors = {};
        if (!username || username.trim() === '') errors.username = { msg: 'Username is required' };
        if (!email || email.trim() === '') errors.email = { msg: 'Email is required' };
        if (!mobileno || mobileno.trim() === '') errors.mobileno = { msg: 'Mobile number is required' };

        // If there are validation errors, render the edit form with errors
        if (Object.keys(errors).length > 0) {
            const user = await User.findById(userId);
            return res.render('user/editProfile', { user, errors, message: 'Please fix the errors' });
        }

        // Update the user's profile in the database
        await User.findByIdAndUpdate(userId, {
            username,
            email,
            mobileno,
        }, { new: true }); // `new: true` returns the updated document

        // Redirect to the user profile page after successful update
        res.redirect('/userDetails');
    } catch (error) {
        console.error('Error updating user profile:', error.message);
        res.status(500).send('Server Error');
    }
};


const getChangePasswordPage = async (req, res) => {
    try {
        // Get user ID from session
        const userId = req.session.user_id;

        if (!userId) {
            // If no user is logged in, redirect to the login page
            return res.redirect('/login');
        }

        // Fetch user details from the database
        const user = await User.findById(userId);

        if (!user) {
            // If user is not found, redirect to the login page
            return res.redirect('/login');
        }

        // Render the change password page with user data
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

        // Fetch user from database
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/login');
        }

        // Check if current password is correct
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.render('user/changePassword', {user,
                message: 'Current password is incorrect.',
                errors: null,
            });
        }

        // Check if new password and confirm password match
        if (newPassword !== confirmPassword) {
            return res.render('user/changePassword', {user,
                message: 'New password and confirm password do not match.',
                errors: null,
            });
        }

        // Validate new password (Add more validation as needed)
        if (newPassword.length < 6) {
            return res.render('user/changePassword', {
                message: 'New password must be at least 6 characters long.',
                errors: null,
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user's password in the database
        user.password = hashedPassword;
        await user.save();

        // Redirect to the profile page with success message
        res.redirect('/userDetails'); // Adjust redirect path as needed
    } catch (error) {
        console.error('Error changing password:', error.message);
        res.status(500).send('Server Error');
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

        // Retrieve the active cart
        const cart = await Cart.findOne({ userId, active: true }).populate('products.productId');
        if (!cart) {
            return res.status(404).send('Cart not found');
        }

        // Calculate the total amount
        const totalAmount = cart.products.reduce((total, item) => total + (item.productId.price * item.quantity), 0);

        // Create a new order
        const newOrder = new Order({
            userId,
            addressId,
            products: cart.products.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity
            })),
            totalAmount,
            paymentMethod,
            status: 'Pending'
        });

        // Save the order
        await newOrder.save();

        // Mark cart as inactive
        cart.active = false;
        await cart.save();

        // Optionally delete the cart if needed
        await Cart.deleteOne({ _id: cart._id });

        // Redirect to orders page or send a success response
        res.redirect('/orders');
    } catch (error) {
        console.error('Error placing order:', error.message);
        res.status(500).send('Internal Server Error');
    }
};





const orderLoad = async (req, res) => {
    try {
        const orders = await Order.find().populate('products.productId').populate('addressId');
        console.log('Fetched Orders:', orders);  // Debug output
        res.json({ orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Internal Server Error');
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
    orderLoad

    

};
