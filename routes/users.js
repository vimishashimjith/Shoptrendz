const express = require('express');
const router = express.Router();
const {loginLoad, insertUser, verifyLogin, loadHome, loadRegister}=require('../controller/userController')
const bodyparser=require('body-parser')
router.use(bodyparser.json());
router.use(bodyparser.urlencoded({extended:true}))



/* GET users listing. */

router.get('/signup',loadRegister)
router.post('/signup',insertUser)
router.get('/login',loginLoad)
router.post('/login',verifyLogin)
router.get('/',loadHome)




module.exports = router;
