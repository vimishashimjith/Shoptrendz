const express = require('express');
const router = express.Router();
const {loginLoad, insertUser, verifyLogin, loadHome, loadRegister,verifyOtpLoad,resetPassword,productList,productUnlist, forgetPasswordLoad, verifyMail,forgetVerify, userLogout,verifyOtp, loadProduct, validateSignupBody, resendOTP,loadCart, addToCart, loadProductdetail,forgetLoad, viewCart, checkoutLoad, loadAddress, addAddress, addAddressLoad, showAddress}=require('../controller/userController')
const bodyparser=require('body-parser')
const auth = require('../middleware/auth')
const passport=require('passport')

router.use(bodyparser.urlencoded({extended:true}))
router.use(bodyparser.json());
router.get('/signup', auth.isLogout, loadRegister);
router.get('/showAddress',showAddress );
router.get('/add-address', addAddressLoad);
router.post('/add-address', addAddress);
router.post('/signup',insertUser);
router.get('/login', auth.isLogout, loginLoad);
router.get('/logout', auth.isAuthenticated, userLogout);
router.post('/login', auth.isLogout, verifyLogin);
router.get('/verify-otp', verifyOtpLoad);
router.get('/resend-otp', verifyOtpLoad);
router.post('/verify-otp', verifyOtp);
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});
router.get('/forget',auth.isLogout,forgetLoad)
router.get('/forget-password',auth.isLogout,forgetPasswordLoad)
router.post('/forget-password',resetPassword)
router.post('/forget',forgetVerify)
router.get('/', loadHome);
router.get('/product', loadProduct);


router.get('/productdetail/:id', loadProductdetail);
router.get('/cart', viewCart);
router.post('/cart', addToCart);
router.get('/checkout', checkoutLoad);

module.exports = router;
