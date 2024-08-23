const bcrypt = require('bcrypt'); 
const Category = require('../model/categorySchema');
const Product = require('../model/productSchema'); 
const adminLayout = './layouts/auth/admin/authLayout.ejs';
module.exports = {
    showProduct: async (req, res) => {
        try {
            const products = await Product.find()
            .populate('category', 'name') 
            .exec();
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
    addProduct: async (req, res) => {
        const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    
        try {
            if (req.method === 'GET') {
                const categories = await Category.find();
                res.render('admin/product-add', {
                    title: 'Add Product',
                    layout: adminLayout,
                    categories,
                    validSizes,
                    message: null
                });
            } else if (req.method === 'POST') {
                console.log('Request Body:', req.body);
    
                const { name, brand, description, price, category, color } = req.body;
                const sizes = req.body.sizes;  // Corrected from req.body.size to req.body.sizes
                const categories = await Category.find();
    
                if (!Array.isArray(sizes)) {
                    return res.render('admin/product-add', {
                        message: 'Sizes must be an array',
                        categories,
                        validSizes,
                    });
                }
    
                // Validate each size entry
                for (const sizeEntry of sizes) {
                    if (sizeEntry && sizeEntry.size && sizeEntry.stock !== undefined) {
                        if (!validSizes.includes(sizeEntry.size)) {
                            return res.render('admin/product-add', {
                                message: `Invalid size: ${sizeEntry.size}`,
                                categories,
                                validSizes,
                            });
                        }
                    }
                }
    
                const productSizes = sizes.map(sizeEntry => ({
                    size: sizeEntry.size,  // Corrected from sizeEntry.sizes to sizeEntry.size
                    stock: parseInt(sizeEntry.stock),
                }));
                const images = req.files ? req.files.map(file => ({ url: file.filename })) : [];
    
                const newProduct = new Product({
                    name,
                    brand,
                    description,
                    category,
                    color,
                    size: productSizes,
                    price: parseFloat(price),
                    images
                });
    
                await newProduct.save();
                res.redirect('/admin/products');
            }
        } catch (error) {
            console.error('Error adding product:', error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
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
    
     productList:async(req,res)=>{
        try {
            const productId = req.params.id;
            const product = await Product.findById(productId);
    
            if (!product) {
                return res.status(404).send("Product not found");
            }
    
            
            await product.save();
            res.redirect('/admin/products');
        } catch (error) {
            console.error('Error listing product:', error.message);
            res.status(500).send("Internal Server Error");
        }
    }
     ,


      softDeleteProduct : async (req, res) => {
        try {
            const id = req.query.id;
            const product = await Product.findById(id);
    
            if (!product) {
                return res.status(404).send("Product not found");
            }
    
            product.softDelete = true;
            await product.save();
            res.redirect('/admin/products');
        } catch (error) {
            console.error('Error in softDeleting product:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },
    
    removeSoftDeleteProduct : async (req, res) => {
        try {
            const id = req.query.id;
            const product = await Product.findById(id);
    
            if (!product) {
                return res.status(404).send("Product not found");
            }
    
            product.softDelete = false;
            await product.save();
            res.redirect('/admin/products');
        } catch (error) {
            console.error('Error in removing soft delete from product:', error.message);
            res.status(500).send("Internal Server Error");
        }
}
}
