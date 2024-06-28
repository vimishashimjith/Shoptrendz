const User = require('../model/userSchema');
const OtpData =require('../model/otpSchema')
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const session = require('express-session');
const otpGenerator = require('otp-generator');
const bodyParser = require('body-parser');
const Product=require('../model/productSchema')



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
            text:` Your OTP code is ${otp}. It is valid for 10 minutes.`
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
        res.render('user/product');
    } catch (error) {
        console.log(error.message);
    }
};
const insertUser = async (req, res) => {
    try {
        const spassword = await securePassword(req.body.password);
        const user = new User({
            username: req.body.username,
            email: req.body.email,
            mobileno: req.body.mobileno,
            password: spassword,
            isAdmin: false,
            isVerified: false
        });

        const userDatacheck = await User.findOne({ email: req.body.email });
        console.log(userDatacheck);
        if (!userDatacheck) {
            const userData = await user.save();
            const userId = userData._id;

            if (userData) {
                const otp = generateOtp();
                console.log(otp);

                const otpData = new OtpData({
                    userId: userId,
                    otp: otp
                });

                await otpData.save(); // Ensure OTP is saved before sending the email
                sendOtpMail(userData.email, otp);
                
                res.redirect(`/verify-otp?user_id=${userId}`); // Pass user ID to the template
            } else {
                res.render('user/signup', { message: "Your registration has failed" });
            }
        } else {
            res.render('user/signup', { message: "That user already exists!!...Try Again" });
        }
    } catch (error) {
        console.log(error.message);
        res.render('user/signup', { message: "An error occurred during registration. Please try again." });
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
            res.render('user/verify-otp')
            console.log("error")
         }
        
    } catch (error) {
        console.log(error.message)
    }
}


// OTP generation and verification

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

const verifyLogin = async(req,res)=>{
    try {
        const email = req.body.email;
        const password = req.body.password;
        console.log(email,password)
        const userData = await User.findOne({email:email})
        
        if(userData){
         
            const passwordMatch = await bcrypt.compare(password,userData.password)
            if(passwordMatch){
                req.session.user_id = userData._id;
                res.redirect('/')
            }else{
                res.render('user/login',{message:"email and password is incorrect",user:null})
            }}else{
                res.render('user/login',{message:"email and password is incorrect",user:null})
            }
        }

    catch (error) {
     console.log(error.message);   
    }
}





const loadHome = async (req, res) => {
    try {
        
        const product= await Product.find()
        res.render('user/index',{product,user:req.session.user});
    } catch (error) {
        console.log(error.message);
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
    

};
