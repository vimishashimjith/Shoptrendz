const express = require('express');
const router = express.Router();
const {
    loginLoad, insertUser, verifyLogin, loadHome, loadRegister,
    verifyOtpLoad, resetPassword, forgetPasswordLoad, forgetVerify,
    userLogout, verifyOtp, loadProduct, loadProductdetail, forgetLoad,
    viewCart, addToCart, checkoutLoad, addAddress, addAddressLoad, successGoogleLogin, errorlogin, updateCartQuantity, removeFromCart,
    showAddress, loadEditAddress, updateAddress, deleteAddress, getUserDetails, editProfileLoad, editProfile, getChangePasswordPage,
    changePassword, placeOrder, orderLoad, cancelOrder, resendOTP,
    searchProduct, paymentProcess,
    addTowishlist,
    removeWishlist,
    wishlistLoad
} = require('../controller/userController');
const bodyparser = require('body-parser');
const auth = require('../middleware/auth');
const passport = require('passport');

require('../config/passport');
router.use(passport.initialize());
router.use(passport.session());

router.use(bodyparser.urlencoded({ extended: true }));
router.use(bodyparser.json());


router.get('/signup', auth.isLogout, loadRegister);
router.post('/signup', insertUser);
router.get('/login', auth.isLogout, loginLoad);
router.post('/login', auth.isLogout, verifyLogin);
router.get('/verify-otp', verifyOtpLoad);
router.get('/resend-otp', resendOTP);
router.post('/verify-otp', verifyOtp);
router.get('/forget', auth.isLogout, forgetLoad);
router.get('/forget-password', auth.isLogout, forgetPasswordLoad);
router.post('/forget-password', resetPassword);
router.post('/forget', forgetVerify);
router.get('/', loadHome);
router.get('/product', loadProduct);
router.get('/productdetail/:id', loadProductdetail);
router.get('/logout', auth.isAuthenticated, userLogout);


router.get('/searchProduct',searchProduct)
router.get('/add-address', auth.isAuthenticated, addAddressLoad);
router.post('/add-address', auth.isAuthenticated, addAddress);
router.get('/showAddress', auth.isAuthenticated, showAddress);
router.get('/edit-address/:id', auth.isAuthenticated, loadEditAddress);
router.post('/edit-address/:id', auth.isAuthenticated, updateAddress);
router.post('/delete-address/:id', auth.isAuthenticated, deleteAddress);
router.get('/cart', auth.isAuthenticated, viewCart);
router.post('/cart/:productId', auth.isAuthenticated, addToCart);
router.post('/cart/update-quantity/:productId', auth.isAuthenticated, updateCartQuantity);
router.post('/cart/remove/:productId', auth.isAuthenticated, removeFromCart);
router.get('/checkout', auth.isAuthenticated, checkoutLoad);
router.post('/checkout', auth.isAuthenticated, placeOrder);
router.post('/addTowishlist',auth.isAuthenticated, addTowishlist);
router.get('/wishlist',wishlistLoad)


router.delete('/removeWishlist', auth.isAuthenticated,removeWishlist);

router.get('/orders', auth.isAuthenticated, orderLoad);
router.post('/cancelOrder', auth.isAuthenticated, cancelOrder);

router.post('/paymentProcess',auth.isAuthenticated,paymentProcess)



router.get('/success', successGoogleLogin);
router.get('/failure', errorlogin);
router.get('/userDetails', auth.isAuthenticated, getUserDetails);
router.get('/editProfile', auth.isAuthenticated, editProfileLoad);
router.post('/editProfile', auth.isAuthenticated, editProfile);
router.get('/changePassword', auth.isAuthenticated, getChangePasswordPage);
router.post('/changePassword', auth.isAuthenticated, changePassword);
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', 
    passport.authenticate("google", { failureRedirect: "/failure" }),
    (req, res) => {
      req.session.user_id = req.user;
      res.redirect("/");
    }
);

module.exports = router;
