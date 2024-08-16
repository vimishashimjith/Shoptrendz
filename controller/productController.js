const bcrypt = require('bcrypt'); 
const Category = require('../model/categorySchema');
const Product = require('../model/productSchema'); 
const adminLayout = './layouts/auth/admin/authLayout.ejs';
module.exports = {
    showProduct: async (req, res) => {
        try {
            const products = await Product.find();
            res.render('admin/products', { 
                title: 'Products',
                layout: adminLayout,
                products
            });
            console.log(products)
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },
   
    addProduct : async (req, res) => {
        const validSizes = ['S', 'M', 'L', 'XL', 'XXL'];
        try {
            if (req.method === 'GET') {
                const categories = await Category.find();
                res.render('admin/product-add', {
                    title: 'Add Product',
                    layout:adminLayout,
                    categories,
                    validSizes,
                    message: null
                });
            } else if (req.method === 'POST') {
                const { name, brand, description, price, category, sizes } = req.body;
                const images = req.files ? req.files.map(file => ({ url: file.filename })) : [];
                const sizeStockArray = sizes ? sizes.map(sizeStock => ({
                    size: sizeStock.size,
                    stock: sizeStock.stock
                })) : [];
    
                const newProduct = new Product({
                    name,
                    brand,
                    description,
                    price,
                    category,
                    sizes: sizeStockArray,
                    images
                });
    
                await newProduct.save();
                console.log(newProduct);
                res.redirect('/admin/products'); 
            }
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    editProduct: async (req, res) => {
        const validSizes = ['S', 'M', 'L', 'XL', 'XXL'];
        try {
            if (req.method === 'GET') {
                const categories = await Category.find();
                const product = await Product.findById(req.params.id);
                if (!product) {
                    return res.status(404).send('Product not found');
                }
                res.render('admin/product-edit', {
                    title: 'Edit Product',
                    layout:adminLayout,
                    categories,
                    validSizes,
                    product,
                    message: null 
                });
            } else if (req.method === 'POST') {
                const { name, brand, description, price, category, sizes } = req.body;
                const images = req.files ? req.files.map(file => ({ url: file.filename })) : [];
                
                await Product.findByIdAndUpdate(req.params.id, {
                    name,
                    brand,
                    description,
                    price,
                    category,
                    sizes,
                    images
                });
    
                res.redirect('/admin/products'); 
            }
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },
    
     updateProduct : async (req, res) => {
        try {
            const { id } = req.params;
            const { name, brand, description, price, category, sizes } = req.body;
            const files = req.files || [];
            const images = files.map(file => ({ url: file.filename }));
    
            const updateData = {
                name,
                brand,
                description,
                price,
                category,
                sizes,
                images: images.length ? images : undefined 
            };
    
            const updatedProduct = await Product.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    
            if (!updatedProduct) {
                return res.status(404).send('Product not found');
            }
    
            res.redirect('/admin/products');
        } catch (error) {
            console.error('Error updating product:', error.message);
            res.status(500).send('Internal Server Error');
        }
    },
    
    
    deleteProduct: async (req, res) => {
        try {
            const productId = req.params.id;
            const deletedProduct = await Product.findByIdAndDelete(productId);
            if (!deletedProduct) {
                return res.status(404).send("Product not found");
            }
            res.redirect('/admin/products');
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    }
};
