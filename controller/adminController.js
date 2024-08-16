const bcrypt = require('bcrypt');
const User = require('../model/userSchema'); 
const Category = require('../model/categorySchema');
const Product = require('../model/productSchema'); 
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

    blockUser: async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).send("User not found");
            }

            user.isBlocked = !user.isBlocked;
            await user.save();

            if (user.isBlocked) {
                req.session.destroy(); 
            }

            res.redirect('/admin/admin-users');
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error");
        }
    }
};