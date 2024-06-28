const express = require('express');
const router = express.Router();
const multer = require('multer');

const layout = './layouts/adminLayout.ejs';
const adminController = require('../controller/adminController');

// Define storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads');
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.split(' ').join('-');
    cb(null, `${fileName}-${Date.now()}`);
  }
});

// Define the upload middleware
const upload = multer({ storage: storage });

// Define routes
router.get('/login', adminController.getAdminLogin);
router.post('/login', adminController.verifyLogin);
router.get('/home', adminController.loadDashboard);
router.get('/admin-users', adminController.adminDashboard);
router.get('/categories', adminController.listCategories);
router.get('/category-add', adminController.adminCategory);
router.post('/category-add', adminController.addCategory);
router.get('/category-edit/:id', adminController.editCategory);
router.post('/category-edit/:id', adminController.updateCategory);
router.get('/category-delete/:id', adminController.deleteCategory);
router.get('/products', adminController.showProduct);
router.get('/product-add', adminController.addProduct);
router.post('/product-add', upload.array('images', 10), adminController.addProduct);
router.get('/product-edit/:id', adminController.editProduct);
router.post('/product-edit/:id', adminController.updateProduct);
router.get('/product-delete/:id', adminController.deleteProduct);

router.get('/block/:id', adminController.blockUser);
router.get('/unblock/:id', adminController.unBlockUser);


module.exports = router;
