const express = require('express');
const router = express.Router();
const {
    loginLoad, insertUser, verifyLogin, loadHome, loadRegister,
    verifyOtpLoad, resetPassword, forgetPasswordLoad, forgetVerify,
    userLogout, verifyOtp, loadProduct, loadProductdetail, forgetLoad,
    viewCart, addToCart, checkoutLoad, loadAddress, addAddress, addAddressLoad,successGoogleLogin,errorlogin , updateCartQuantity,removeFromCart,
    showAddress,loadEditAddress,updateAddress,deleteAddress
} = require('../controller/userController');
const bodyparser = require('body-parser');
const auth = require('../middleware/auth');
const passport = require('passport');
require('../config/passport')
router.use(passport.initialize());
router.use(passport.session())

router.use(bodyparser.urlencoded({ extended: true }));
router.use(bodyparser.json());

router.get('/signup', auth.isLogout, loadRegister);
router.get('/add-address', auth.isAuthenticated,addAddressLoad);
router.post('/add-address',auth.isAuthenticated, addAddress);
router.get('/showAddress',auth.isAuthenticated, showAddress);
router.get('/edit-address/:id', auth.isAuthenticated, loadEditAddress);
router.post('/edit-address/:id', auth.isAuthenticated, updateAddress);
router.post('/delete-address/:id', auth.isAuthenticated, deleteAddress);


router.post('/signup', insertUser);
router.get('/login', auth.isLogout, loginLoad);
router.get('/logout', auth.isAuthenticated, userLogout);
router.post('/login', auth.isLogout, verifyLogin);
router.get('/verify-otp', verifyOtpLoad);
router.get('/resend-otp', verifyOtpLoad);
router.post('/verify-otp', verifyOtp);
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', 
    passport.authenticate("google", { failureRedirect: "/failure" }),
    (req, res) => {
      req.session.user_id = req.user;
      res.redirect("/");
    }
  );
   
router.get('/forget', auth.isLogout, forgetLoad);
router.get('/forget-password', auth.isLogout, forgetPasswordLoad);
router.post('/forget-password', resetPassword);
router.post('/forget', forgetVerify);
router.get('/', loadHome);
router.get('/product', loadProduct);
router.get('/productdetail/:id', loadProductdetail);
router.get('/cart', viewCart);
router.post('/cart/:productId', auth.isAuthenticated, addToCart);
router.post('/cart/update-quantity/:productId', updateCartQuantity);
router.post('/cart/remove/:productId', removeFromCart);

router.get('/checkout',checkoutLoad);
router.get("/success", successGoogleLogin);
router.get("/failure",errorlogin );





module.exports = router;
