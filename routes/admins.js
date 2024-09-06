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

// Middleware for parsing request bodies
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(express.static('public'));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads')); // Path where files are stored
    },
    filename: function(req, file, cb) {
        const name = Date.now() + '-' + file.originalname; // Unique filename
        cb(null, name);
    }
});

const upload = multer({ storage: storage });

// Routes

// Admin login routes
router.get('/login', adminAuth.isLogout, adminController.getAdminLogin);
router.post('/login', adminController.verifyLogin);

// Admin dashboard and management routes
router.get('/home', adminAuth.isLogin, adminController.loadDashboard);
router.get('/admin-users', adminAuth.isLogin, adminController.adminDashboard);

// Category management routes
router.get('/categories', adminAuth.isLogin, categoryController.listCategories);
router.get('/category-add', adminAuth.isLogin, categoryController.adminCategory);
router.post('/category-add', adminAuth.isLogin, categoryController.addCategory);
router.get('/category-edit/:id', adminAuth.isLogin, categoryController.editCategory);
router.post('/category-edit/:id', adminAuth.isLogin, categoryController.updateCategory);

// Product management routes
router.get('/products', adminAuth.isLogin, productController.showProduct);
router.get('/product-add', adminAuth.isLogin, productController.addProduct);
router.post('/product-add', adminAuth.isLogin, upload.array('images', 10), productController.addProduct);
router.get('/product-edit/:id', adminAuth.isLogin, productController.editProduct);
router.post('/product-edit/:id', adminAuth.isLogin, upload.array('images', 10), productController.updateProduct);

// Product soft-delete and restore routes
router.get('/products/softdeleteproduct', adminAuth.isLogin, productController.softDeleteProduct);
router.get('/products/removeSoftDeleteProduct', adminAuth.isLogin, productController.removeSoftDeleteProduct);

// User management route
router.get('/block/:id', adminAuth.isLogin, adminController.blockUser);

// Order management routes
router.get('/orderManagement', adminAuth.isLogin, adminController.loadOrderManagementPage);
router.get('/order-details/:orderId', adminAuth.isLogin, adminController.getOrderDetails);
router.post('/updateStatus', adminAuth.isLogin, adminController.updateOrderStatus);
router.post('/cancelOrders', adminAuth.isLogin, adminController.cancelOrders);

// Logout route
router.get('/logout', adminAuth.isLogin, adminController.logout);

module.exports = router;
