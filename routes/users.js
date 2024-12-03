const express = require('express');
const router = express.Router();
const {
    loginLoad, insertUser, verifyLogin, loadHome, loadRegister,
    verifyOtpLoad, resetPassword, forgetPasswordLoad, forgetVerify,
    userLogout, verifyOtp, loadProduct, loadProductdetail, forgetLoad,
    addAddress, addAddressLoad, successGoogleLogin, errorlogin,
    showAddress, loadEditAddress, updateAddress, deleteAddress, getUserDetails,
    editProfileLoad, editProfile, getChangePasswordPage,changePassword,resendOTP,
    searchProduct, addTowishlist,wishlistLoad,removeFromWishlist, 
} = require('../controller/userController');

const {
  viewCart,
  addToCart,
  updateCartQuantity,
  removeFromCart
} = require('../controller/cartController');

const {
  checkoutLoad,
    placeOrder,
    paymentProcess,
    payAgain,
    orderLoad,
    requestCancellation,
    returnOrder,
    validateCoupon,
    downloadInvoice
} = require('../controller/orderController');

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
router.get('/checkout', auth.isAuthenticated,auth.isBlocked,checkoutLoad);
router.post('/checkout', auth.isAuthenticated,auth.isBlocked,placeOrder);
router.post('/addTowishlist', auth.isAuthenticated, addTowishlist);

router.get('/wishlist',auth.isAuthenticated,wishlistLoad)
router.post('/removeFromwishlist/:productId',auth.isAuthenticated,removeFromWishlist);
router.get('/downloadInvoice/:orderId', downloadInvoice);
router.get('/orders', auth.isAuthenticated, orderLoad);

router.post('/returnOrder',auth.isAuthenticated,returnOrder)
router.post('/requestCancellation',auth.isAuthenticated,requestCancellation)

router.post('/validateCoupon', auth.isAuthenticated,validateCoupon);
router.post('/process-payment',auth.isAuthenticated,paymentProcess)
router.post('/payAgain/:id', auth.isAuthenticated,payAgain)


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
