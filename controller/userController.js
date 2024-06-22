const User = require('../model/userSchema');
const OtpData =require('../model/otpSchema')
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const session = require('express-session');
const otpGenerator = require('otp-generator');
const bodyParser = require('body-parser');

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
            is_admin: false,
            isVerified: false
        });

        const userDatacheck = await User.findOne({ email: req.body.email });
        console.log(userDatacheck);
        if (!userDatacheck) {
            const userData = await user.save();
            const userId=userData._id
             
            if (userData) {
                const otp=generateOtp()
                console.log(otp)
                const otpData=await new OtpData({
                    userId:userData._id,
                    otp:otp
                })
                otpData.save();
                sendOtpMail( userData.email, otp);
                res.render('user/verify-otp',{user_id:userId})
            } else {
                res.render('user/signup', { message: "Your registration has failed" });
            }
        } else {
            res.render('user/signup', { message: "That user already exists!!...Try Again" });
        }
    } catch (error) {
        console.log(error.message);
    }
};

const verifyOtp = async (req, res) => {
    const { id, otp } = req.query;

    try {
        // Find the user by ID
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the provided OTP matches the stored OTP
        if (user.otp === otp) {
            // Update the user's verification status
            const updateInfo = await User.updateOne(
                { _id: id },
                { $set: { isVerified: true }, $unset: { otp: '' } } // Optionally remove OTP after verification
            );
            console.log(updateInfo);
            return res.render('user/login');
        } else {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};




// OTP generation and verification

const generateOtp = () => {
    return otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });

};

const loginLoad = async (req, res) => {
    try {
        res.render('user/login');
    } catch (error) {
        console.log(error.message);
    }
};

const verifyLogin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const userData = await User.findOne({ email: email });

        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (passwordMatch) {
                if (!userData.isVerified) {
                    const otp = generateOtp();
                    const otpData = new OtpData({
                        userId: userData._id,
                        otp: otp
                    });
                    await otpData.save();
                    sendOtpMail(email, otp);
                    res.render('user/verify-otp', { message: "Please enter the OTP sent to your email" });
                } else {
                    req.session.user_id = userData._id;
                    res.redirect('/');
                }
            } else {
                res.render('user/login', { message: "Email and password is incorrect" });
            }
        } else {
            res.render('user/login', { message: "Email and password is incorrect" });
        }
    } catch (error) {
        console.log(error.message);
    }
};



const loadHome = async (req, res) => {
    try {
        res.render('user/index');
    } catch (error) {
        console.log(error.message);
    }
};

module.exports = {
    loadRegister,
    insertUser,
    loginLoad,
    verifyLogin,
    loadHome,
    verifyOtp,
    loadProduct
};
