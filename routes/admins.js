const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const layout = './layouts/adminLayout.ejs';
const adminController = require('../controller/adminController');
const categoryController = require('../controller/categoryController');
const productController = require('../controller/productController');
const adminAuth = require('../middleware/adminAuth');
const bodyParser = require('body-parser');


router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(express.static('public'));


const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads')); 
    },
    filename: function(req, file, cb) {
        const name = Date.now() + '-' + file.originalname; 
        cb(null, name);
    }
});

const upload = multer({ storage: storage });


router.get('/login', adminAuth.isLogout, adminController.getAdminLogin);
router.post('/login', adminController.verifyLogin);

router.get('/home', adminAuth.isLogin, adminController.loadDashboard);
router.get('/admin-users', adminAuth.isLogin, adminController.adminDashboard);

router.get('/categories', adminAuth.isLogin, categoryController.listCategories);
router.get('/category-add', adminAuth.isLogin, categoryController.adminCategory);
router.post('/category-add', adminAuth.isLogin, categoryController.addCategory);
router.get('/category-edit/:id', adminAuth.isLogin, categoryController.editCategory);
router.post('/category-edit/:id', adminAuth.isLogin, categoryController.updateCategory);


router.get('/products', adminAuth.isLogin, productController.showProduct);
router.get('/product-add', adminAuth.isLogin, productController.addProduct);
router.post('/product-add', adminAuth.isLogin, upload.array('images', 10), productController.addProduct);
router.get('/product-edit/:id', adminAuth.isLogin, productController.editProduct);
router.post('/product-edit/:id', adminAuth.isLogin, upload.array('images', 10), productController.updateProduct);



router.get('/products/softdeleteproduct', adminAuth.isLogin, productController.softDeleteProduct);
router.get('/products/removeSoftDeleteProduct', adminAuth.isLogin, productController.removeSoftDeleteProduct);


router.get('/block/:id', adminAuth.isLogin, adminController.blockUser);


router.get('/orderManagement', adminAuth.isLogin, adminController.loadOrderManagementPage);

router.get('/orderDetails/:orderId', adminController.getOrderDetails);

router.post('/updateStatus', adminAuth.isLogin, adminController.updateOrderStatus);
router.post('/cancelOrders', adminAuth.isLogin, adminController.cancelOrders);
router.get('/coupon', adminAuth.isLogin, adminController.getCouponCodes);
router.get('/addCoupon', adminAuth.isLogin, adminController.addCouponLoad);

router.post('/addCoupon', adminAuth.isLogin, adminController.addCoupon);

router.get('/logout', adminAuth.isLogin, adminController.logout);
router.post('/removeCoupon/:id',adminAuth.isLogin,adminController.removeCoupon);

router.get('/productOffer', adminAuth.isLogin, productController.offerPageLoad);
router.post('/productOffer/:id', adminAuth.isLogin, productController.productOffer);
router.get('/removeOffer', adminAuth.isLogin, productController.removeOffer);



module.exports = router;
