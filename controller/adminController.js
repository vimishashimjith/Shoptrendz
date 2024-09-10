const bcrypt = require('bcrypt');
const User = require('../model/userSchema'); 
const Order = require('../model/orderSchema');
const Product = require('../model/productSchema');
const adminLayout = './layouts/auth/admin/authLayout.ejs';
const mongoose = require('mongoose');

module.exports = {
    getAdminLogin: async (req, res) => {
        if (req.session.adminId) {
            return res.redirect('/admin/home');
        }

        res.render('admin/login', {
            title: 'Admin Page',
            layout: adminLayout
        });
    },

    verifyLogin: async (req, res) => {
        try {
            const { email, password } = req.body;
            const admin = await User.findOne({ email, isAdmin: true });

            if (admin) {
                const passwordMatch = await bcrypt.compare(password, admin.password);

                if (passwordMatch) {
                    req.session.adminId = admin._id;  // Set admin session ID
                    res.redirect("/admin/home");
                } else {
                    res.render('admin/login', { 
                        title: 'Admin Page', 
                        layout: adminLayout, 
                        message: "Email and password are incorrect" 
                    });
                }
            } else {
                res.render('admin/login', { 
                    title: 'Admin Page', 
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
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }

            const adminData = await User.findById(req.session.adminId);
            if (adminData && adminData.isAdmin) {
                res.render('admin/home', { 
                    title: 'Admin Home', 
                    layout: adminLayout, 
                    admin: adminData 
                });
            } else {
                res.status(403).redirect('/admin/login');
            }
        } catch (error) {
            console.error('Error in loadDashboard:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },



    logout: async (req, res) => {
        try {
            req.session.destroy(err => {
                if (err) {
                    console.error('Error in logout:', err);
                    return res.status(500).send('Internal Server Error');
                }
                res.redirect('/admin/login');
            });
        } catch (error) {
            console.error('Error in logout:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },



    adminDashboard: async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }

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
                title: 'Admin Users',
                layout: adminLayout,
                users: usersData
            });
        } catch (error) {
            console.error('Error in adminDashboard:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },

    blockUser: async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }

            const userId = req.params.id;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).send("User not found");
            }

            user.isBlocked = !user.isBlocked;
            await user.save();

            res.redirect('/admin/admin-users');
        } catch (error) {
            console.error('Error in blockUser:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },

  loadOrderManagementPage : async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }
    
            
            const page = parseInt(req.query.page, 8) || 1;
            const limit = 8; 
            const skip = (page - 1) * limit; 
    
            
            const totalOrders = await Order.countDocuments();
    
           
            const orders = await Order.find()
                .populate('userId', 'username email')
                .populate('addressId', 'street city zipcode')
                .skip(skip)
                .limit(limit);
    
          
            const totalPages = Math.ceil(totalOrders / limit);
    
            
            res.render('admin/orderManagement', { 
                title: 'Order Management', 
                layout: adminLayout, 
                orders,
                currentPage: page,          
                totalPages: totalPages       
            });
        } catch (error) {
            console.error('Error in loadOrderManagementPage:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },
    

    getOrderDetails: async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }

            const orderId = req.params.orderId;
            const order = await Order.findById(orderId)
                .populate('userId', 'username email')
                .populate('addressId', 'street city zipcode');

            if (!order) {
                return res.status(404).send("Order not found");
            }

            res.render('admin/order-details', { 
                title: 'Order Details', 
                layout: adminLayout, 
                order 
            });
        } catch (error) {
            console.error('Error in getOrderDetails:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },

   updateOrderStatus : async (req, res) => {
        try {
          if (!req.session.adminId) {
            return res.redirect('/admin/login');
          }
      
          const { orderId, status } = req.body;
          const validStatuses = ['Shipped', 'Out-For-Delivery', 'Delivered', 'Cancelled'];
      
          if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
          }
      
         
          const order = await Order.findById(orderId).populate('products.productId'); 
          if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
          }
      
          order.status = status;
          await order.save();
      
          
          if (status === 'Delivered') {
            for (const item of order.products) {
                const product = item.productId;
              
                if (product) {
                  console.log(`Product found: ${product.name}`);
              
                 
                  const sizeObj = product.sizes.find(s => s.size === item.size); 
              
                  if (sizeObj) {
                    console.log(`Size found: ${sizeObj.size}, Current stock: ${sizeObj.stock}, Ordered quantity: ${item.quantity}`);
              
                  
                    if (sizeObj.stock >= item.quantity) {
                      sizeObj.stock -= item.quantity; 
                      await product.save(); 
              
                      console.log(`Stock after update for size ${sizeObj.size}: ${sizeObj.stock}`);
                    } else {
                      console.error(`Not enough stock for Product: ${product.name}, Size: ${item.size}`);
                      return res.status(400).json({ success: false, message: `Not enough stock for ${product.name} (Size: ${item.size})` });
                    }
                  } else {
                    console.error(`Size ${item.size} not found for Product: ${product.name}`);
                    return res.status(400).json({ success: false, message: `Size ${item.size} not found for ${product.name}` });
                  }
                } else {
                  console.error(`Product not found for ID: ${item.productId}`);
                  return res.status(404).json({ success: false, message: 'Product not found' });
                }
            }}
              
          res.json({ success: true, message: 'Order status updated and stock decremented successfully' });
        } catch (error) {
          console.error('Error in updateOrderStatus:', error.message);
          res.status(500).json({ success: false, message: 'Server error' });
        }
      },
      
    cancelOrders: async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }

            const { ids } = req.body;

            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'No orders selected' });
            }

            const result = await Order.updateMany(
                { _id: { $in: ids } },
                { $set: { status: 'Cancelled' } }
            );

            res.json({ success: true, message: `${result.nModified} orders have been cancelled` });
        } catch (error) {
            console.error('Error in cancelOrders:', error.message);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    
};
