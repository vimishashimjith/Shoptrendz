const bcrypt = require('bcrypt'); 
const Category = require('../model/categorySchema');
const Product = require('../model/productSchema'); 
const adminLayout = './layouts/auth/admin/authLayout.ejs';
const  validationResult  = require('express-validator')
const User=require('../model/userSchema')

const path = require('path');
const fs = require('fs');  

module.exports = {
    showProduct : async (req, res) => {
        try {
            let page = parseInt(req.query.page) || 1; 
            const limit = 5; 
            let search = req.query.search || ''; 
    
           
            let query = {};
            if (search) {
                query = {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { brand: { $regex: search, $options: 'i' } }
                    ]
                };
            }
    
            const totalProducts = await Product.countDocuments(query);
            const products = await Product.find(query)
                .populate('category', 'name')
                .limit(limit)
                .skip((page - 1) * limit)
                .exec();
    
            const totalPages = Math.ceil(totalProducts / limit);
    
            res.render('admin/products', {
                title: 'Products',
                layout: adminLayout,
                products,
                currentPage: page,
                totalPages,
                search 
            });
    
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
                    message: null,
                    errors: {}
                });
            } else if (req.method === 'POST') {
                console.log('Request Body:', req.body);
    
                const { name, brand, description, price, category, color } = req.body;
                const sizes = req.body.sizes; 
                const categories = await Category.find();
    
                let errors = {};
    
              
                if (!name) errors.name = 'Product name is required.';
                if (!brand) errors.brand = 'Brand is required.';
                if (!description) errors.description = 'Description is required.';
                if (!price) {
                    errors.price = 'Price is required.';
                } else {
                    const parsedPrice = parseFloat(price);
                    if (isNaN(parsedPrice) || parsedPrice < 0) {
                        errors.price = 'Price must be a non-negative number.';
                    }
                }
                if (!category) errors.category = 'Category is required.';
                if (!color) errors.color = 'Color is required.';
    
                
                if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
                    errors.sizes = 'At least one size must be provided.';
                } else {
                    sizes.forEach((sizeEntry, index) => {
                        const parsedStock = parseInt(sizeEntry.stock);
                        if (!validSizes.includes(sizeEntry.size)) {
                            errors[`sizes[${index}].size`] = 'Invalid size selected.';
                        }
                        if (isNaN(parsedStock) || parsedStock < 0) {
                            errors[`sizes[${index}].stock`] = 'Stock must be a non-negative number.';
                        }
                    });
                }
    
               
                if (Object.keys(errors).length > 0) {
                    return res.render('admin/product-add', {
                        message: 'Please fix the following errors:',
                        categories,
                        validSizes,
                        errors,
                        layout:adminLayout
                    });
                }
    
                const productSizes = sizes.map(sizeEntry => ({
                    size: sizeEntry.size,
                    stock: parseInt(sizeEntry.stock)
                }));
    
                const images = req.files ? req.files.map(file => ({ url: file.filename })) : [];
    
                const newProduct = new Product({
                    name,
                    brand,
                    description,
                    category,
                    color,
                    sizes: productSizes,
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
        const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    
        try {
            if (req.method === 'GET') {
                const productId = req.params.id; 
                const product = await Product.findById(productId);
    
                if (!product) {
                    return res.status(404).render('admin/product-edit', {
                        title: 'Edit Product',
                        layout: adminLayout,
                        categories: await Category.find(),
                        validSizes,
                        message: 'Product not found'
                    });
                }
    
                const categories = await Category.find();
    
                res.render('admin/product-edit', {
                    title: 'Edit Product',
                    layout: adminLayout,
                    categories,
                    validSizes,
                    product,
                    productId,
                    message: null
                });
            } else if (req.method === 'POST') {
                console.log('Request Body:', req.body);
    
                const productId = req.params.productId; 
                const { name, brand, description, price, category, color } = req.body;
                const sizes = req.body.sizes; 
                const categories = await Category.find();
    
                
                const parsedPrice = parseFloat(price);
                if (isNaN(parsedPrice)) {
                    return res.render('admin/product-edit', {
                        message: 'Invalid price',
                        categories,
                        validSizes,
                        product: await Product.findById(productId)
                    });
                }
    
                
                const productSizes = sizes.map(sizeEntry => {
                    
                    const parsedStock = parseInt(sizeEntry.stock);
                    if (isNaN(parsedStock) || !validSizes.includes(sizeEntry.size)) {
                        throw new Error(`Invalid size or stock value`);
                    }
                    return {
                        size: sizeEntry.size,
                        stock: parsedStock
                    };
                });
    
                const images = req.files ? req.files.map(file => ({ url: file.filename })) : [];
    
                
                await Product.findByIdAndUpdate(productId, {
                    name,
                    brand,
                    description,
                    category,
                    color,
                    sizes: productSizes,
                    price: parsedPrice,
                    images
                });
    
                res.redirect('/admin/products');
            }
        
        } catch (error) {
            console.error('Error editing product:', error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },
    


    updateProduct : async (req, res) => {
        try {
            const productId = req.params.id;
            const product = await Product.findById(productId);
    
            if (!product) {
                return res.status(404).send('Product not found');
            }
    
            
            const deletedImages = req.body.deletedImages ? req.body.deletedImages.split(',') : [];
    
            if (deletedImages.length > 0) {
                deletedImages.forEach(imageUrl => {
                    
                    const filePath = path.join(__dirname, '../public/uploads', imageUrl);
                    fs.unlink(filePath, err => {
                        if (err) {
                            console.error(`Failed to delete image: ${imageUrl}`, err);
                        }
                    });
    
                  
                    product.images = product.images.filter(img => img.url !== imageUrl);
                });
            }
    
           
            product.name = req.body.name;
            product.brand = req.body.brand;
            product.description = req.body.description;
            product.category = req.body.category;
            product.sizes = req.body.sizes.map(sizeData => ({
                size: sizeData.size,
                stock: sizeData.stock
            }));
            product.price = req.body.price;
    
          
            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    product.images.push({ url: file.filename });
                });
            }
    
       
            await product.save();
    
            
            res.redirect('/admin/products');
        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    },


  
  
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
},
// Load offer page with product details
// Load offer page with product details
offerPageLoad: async (req, res) => {
    try {
        const productId = req.query.id;
        const userId = req.session.user_id;
        
        const user = await User.findById(userId);
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).send({ success: false, message: 'Product not found' });
        }

        console.log(product);
        res.render('admin/productOffer', { product, layout: adminLayout });
    } catch (error) {
        console.error('Server error:', error.message);
        res.status(500).send({ success: false, message: 'Server error', error: error.message });
    }
},
productOffer: async (req, res) => {
    const productId = req.params.id;
    const { offer, offerStart, offerEnd } = req.body;

    // Validate input data
    if (!offer || !offerStart || !offerEnd) {
        return res.status(400).json({ success: false, message: 'Offer details are required' });
    }

    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { offer, offerStart, offerEnd },
            { new: true } // Return the updated document
        );

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, message: 'Offer added successfully', product: updatedProduct });
    } catch (error) {
        console.error('Error updating offer:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
},

removeOffer : async(req,res)=>{
    try{
        const productId = req.query.id;
        console.log(productId,'id')
        await Product.findByIdAndUpdate(productId,{offer:null,offerStart:null,offerEnd:null});
         
        res.redirect(`/product/offers?id=${productId}`)
        

    }catch(error){
        res.status(500).send('server Error');
    }
}
}
