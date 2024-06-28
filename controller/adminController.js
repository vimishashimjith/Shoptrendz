const bcrypt = require('bcrypt');
const User = require('../model/userSchema'); 
const Category = require('../model/categorySchema');
const Product = require('../model/productSchema'); // Assuming you have a Product model
const adminLayout = './layouts/auth/admin/authLayout.ejs';

module.exports = {
    getAdminLogin: async (req, res) => {
        res.render('admin/login', {
            title: 'Admin Page',
            layout: adminLayout
        });
    },

    verifyLogin: async (req, res) => {
        try {
            const { email, password } = req.body;
            const userData = await User.findOne({ email });

            if (userData) {
                const passwordMatch = await bcrypt.compare(password, userData.password);

                if (passwordMatch) {
                    if (!userData.isAdmin) {
                        res.render('admin/login', { 
                            title: 'Admin Page', 
                            layout: adminLayout, 
                            message: "Email and password are incorrect" 
                        });
                    } else {
                        req.session.user_id = userData._id;
                        res.redirect("home");
                    }
                } else {
                    res.render('admin/login', { 
                        title: 'Auth Page', 
                        layout: adminLayout, 
                        message: "Email and password are incorrect" 
                    });
                }
            } else {
                res.render('admin/login', { 
                    title: 'Auth Page', 
                    layout: adminLayout, 
                    message: "Email and password are incorrect" 
                });
            }
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    loadDashboard: async (req, res) => {
        try {
            if (!req.session.user_id) {
                return res.redirect('admin/login');
            }

            const userData = await User.findById(req.session.user_id);

            if (userData && userData.isAdmin) {
                res.render('admin/home', { 
                    title: 'Admin Home', 
                    layout: adminLayout, 
                    admin: userData 
                });
            } else {
                res.status(403).redirect('admin/login');
            }
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    adminDashboard: async (req, res) => {
        try {
            let search = '';
            if (req.query.search) {
                search = req.query.search;
            }

            const usersData = await User.find({
                isAdmin: false,
                $or: [
                    { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                    { email: { $regex: '.*' + search + '.*', $options: 'i' } }
                ]
            });

            res.render('admin/admin-users', { 
                users: usersData,
                layout: adminLayout
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    adminCategory: async (req, res) => {
        try {
            res.render('admin/category-add', { 
                title: 'Add Category',
                layout: adminLayout
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    addCategory: async (req, res) => {
        try {
            const { name, description } = req.body;
            const newCategory = new Category({ name, description });
            await newCategory.save();
            res.redirect('/admin/categories');
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    listCategories: async (req, res) => {
        try {
            const categories = await Category.find();
            res.render('admin/categories', { 
                title: 'Categories',
                layout: adminLayout,
                categories
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    editCategory: async (req, res) => {
        try {
            const categoryId = req.params.id;
            const category = await Category.findById(categoryId);
            if (!category) {
                return res.status(404).send("Category not found");
            }
            res.render('admin/category-edit', { 
                title: 'Edit Category',
                layout: adminLayout,
                category
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    updateCategory: async (req, res) => {
        try {
            const categoryId = req.params.id;
            const { name, description } = req.body;
            const updatedCategory = await Category.findByIdAndUpdate(categoryId, { name, description }, { new: true });
            if (!updatedCategory) {
                return res.status(404).send("Category not found");
            }
            res.redirect('/admin/categories');
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    deleteCategory: async (req, res) => {
        try {
            const categoryId = req.params.id;
            const deletedCategory = await Category.findByIdAndDelete(categoryId);
            if (!deletedCategory) {
                return res.status(404).send("Category not found");
            }
            res.redirect('/admin/categories');
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    showProduct: async (req, res) => {
        try {
            const products = await Product.find();
            res.render('admin/products', { 
                title: 'Products',
                layout: adminLayout,
                products
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },
   
    addProduct: async (req, res) => {
        const validSizes = ['S', 'M', 'L', 'XL', 'XXL'];
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
                const { name, brand, description, price, category, size, stock } = req.body;
                const images = req.files.map(file => file.filename);
                const newProduct = new Product({ name, brand, description, price, category, size, stock, images });
                await newProduct.save();
                res.redirect('/admin/products'); // Redirect to the products page
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
                    layout: adminLayout,
                    categories,
                    validSizes,
                    product,
                    message: null // Ensure message is defined
                });
            } else if (req.method === 'POST') {
                const { name, brand, description, price, category, size, stock } = req.body;
                const images = req.files ? req.files.map(file => file.filename) : product.images;
                await Product.findByIdAndUpdate(req.params.id, { name, brand, description, price, category, size, stock, images });
                res.redirect('/admin/products'); // Redirect to the products page
            }
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    },
    
    updateProduct: async (req, res) => {
        try {
            const productId = req.params.id;
            const { name, description, price, category } = req.body;
            let images = req.body.existingImages || [];
            if (req.files.length > 0) {
                images = images.concat(req.files.map(file => file.filename));
            }
            const updatedProduct = await Product.findByIdAndUpdate(productId, { name, description, price, category, images }, { new: true });
            if (!updatedProduct) {
                return res.status(404).send("Product not found");
            }
            res.redirect('/admin/products');
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
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
    },

    blockUser: async (req, res) => {
        try {
            const userId = req.params.id;
            console.log(userId,"userid")
            const updateUser = await User.findByIdAndUpdate(userId, { isBlocked: true }, { new: true });
            if (!updateUser) {
                return res.status(404).send("User not found");
            }
            res.redirect('/admin/admin-users')
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: 'error', error: 'Internal server error' });
        }
    },

    unBlockUser: async (req, res) => {
        try {
            const userId = req.params.id;
            const updateUser = await User.findByIdAndUpdate(userId, { isBlocked: false }, { new: true });

            if (!updateUser) {
                return res.status(404).send("User not found");
            }

            res.redirect('/admin/admin-users')
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: 'error', error: 'Internal server error' });
        }
    }
};