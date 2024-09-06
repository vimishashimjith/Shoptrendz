
const Category = require('../model/categorySchema');
const adminLayout = './layouts/auth/admin/authLayout.ejs';
const User=require('../model/userSchema')

module.exports = {
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
    
            const errors = {};
            if (!name) {
                errors.name = 'Category name is required';
            }
            if (!description) {
                errors.description = 'Description is required';
            }
    
            if (Object.keys(errors).length > 0) {
                const user = await User.findById(req.session.User_id);
                return res.render('admin/category-add', {
                    layout: adminLayout,
                    admin: user,
                    errors, // Pass the actual errors object here
                    name,  // Keep the previously entered name value
                    description // Keep the previously entered description value
                });
            }
    
            const normalizedName = name.toLowerCase(); 
    
            // Check for existing category with case-insensitive name
            const existingCategory = await Category.findOne({ name: normalizedName }).collation({ locale: 'en', strength: 2 });
            if (existingCategory) {
                const user = await User.findById(req.session.User_id);
                return res.render('admin/category-add', {
                    layout: adminLayout,
                    admin: user,
                    message: 'Category with this name already exists.',
                    errors: {}, // No validation errors in this case
                    name, // Keep the previously entered name
                    description // Keep the previously entered description
                });
            }
    
            // Save the new category if validation passes
            const newCategory = new Category({ name: normalizedName, description });
            await newCategory.save();
    
            res.redirect('/admin/categories');
    
        } catch (error) {
            console.error(error.message);
            const user = await User.findById(req.session.User_id);
            res.render('admin/category-add', {
                layout: adminLayout,
                admin: user,
                message: 'An error occurred while adding the category.',
                errors: {}, // No validation errors
                name: req.body.name || '', // Refill the form with submitted values
                description: req.body.description || ''
            });
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

  /* deleteCategory: async (req, res) => {
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
    }*/
};
