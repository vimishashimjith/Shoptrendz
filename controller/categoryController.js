
const Category = require('../model/categorySchema');
const adminLayout = './layouts/auth/admin/authLayout.ejs';

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
    }
};
