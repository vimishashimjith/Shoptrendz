const express = require('express');
const router = express.Router();
const {loginLoad, insertUser, verifyLogin, loadHome, loadRegister, verifyMail, userLogout,verifyOtp, loadProduct}=require('../controller/userController')
const bodyparser=require('body-parser')
const auth = require('../middleware/auth')

router.use(bodyparser.json());
router.use(bodyparser.urlencoded({extended:true}))



/* GET users listing. */

router.get('/signup',auth.isLogout,loadRegister)
router.post('/signup',insertUser)
router.get('/verify',verifyLogin)

router.get('/login',auth.isLogout,loginLoad)
router.post('/login',auth.isLogout,verifyLogin)
router.get('/verify-otp',verifyOtp);
router.get('/',loadHome)
router.get('/product',loadProduct)






module.exports = router;
