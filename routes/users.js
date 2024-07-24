const express = require('express');
const router = express.Router();
const {loginLoad, insertUser, verifyLogin, loadHome, loadRegister,verifyOtpLoad, verifyMail, userLogout,verifyOtp, loadProduct, validateSignupBody, resendOTP,loadCart, addToCart}=require('../controller/userController')
const bodyparser=require('body-parser')
const auth = require('../middleware/auth')





router.use(bodyparser.urlencoded({extended:true}))
router.use(bodyparser.json());



/* GET users listing. */
router.get('/signup', auth.isLogout, loadRegister);
router.post('/signup',insertUser);
router.get('/login', auth.isLogout, loginLoad);
router.get('/logout', auth.isAuthenticated, userLogout);
router.post('/login', auth.isLogout, verifyLogin);
router.get('/verify-otp', verifyOtpLoad);
router.get('/resend-otp', verifyOtpLoad);
router.post('/verify-otp', verifyOtp);


router.get('/', loadHome);
router.get('/product', loadProduct);
router.get('/cart', loadCart);
router.post('/add-to-cart', addToCart);






module.exports = router;
