const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs=require('fs')
const path=require('path')

const layout = './layouts/adminLayout.ejs';
const adminController = require('../controller/adminController');
const categoryController=require('../controller/categoryController');
const productController=require('../controller/productController')
const bodyParser =require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended:true}));


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



router.get('/login', adminController.getAdminLogin);
router.post('/login', adminController.verifyLogin);
router.get('/home', adminController.loadDashboard);
router.get('/admin-users', adminController.adminDashboard);
router.get('/categories', categoryController.listCategories);
router.get('/category-add', categoryController.adminCategory);
router.post('/category-add', categoryController.addCategory);
router.get('/category-edit/:id', categoryController.editCategory);
router.post('/category-edit/:id', categoryController.updateCategory);
router.get('/category-delete/:id',categoryController.deleteCategory);
router.get('/products', productController.showProduct);
router.get('/product-add', productController.addProduct);
router.post('/product-add', upload.array('images', 10), productController.addProduct);
router.get('/product-edit/:id', productController.editProduct);
router.post('/product-edit/:id', upload.array('images[]', 10), productController.updateProduct);


router.get('/product-delete/:id', productController.deleteProduct);

router.get('/block/:id', adminController.blockUser);



module.exports = router;
