const bcrypt = require('bcrypt');
const User = require('../model/userSchema'); 
const Order = require('../model/orderSchema');
const Product = require('../model/productSchema');
const adminLayout = './layouts/auth/admin/authLayout.ejs';
const mongoose = require('mongoose');
const Coupon = require('../model/couponSchema'); 
const excel = require('exceljs'); 
const pdf = require('pdfkit'); 
const stream = require('stream');

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
    
            let search = req.query.search || '';
            const page = parseInt(req.query.page, 5) || 1;
            const limit = 5; 
            const skip = (page - 1) * limit; 
    
            const usersData = await User.find({
                isAdmin: false,
                $or: [
                    { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                    { email: { $regex: '.*' + search + '.*', $options: 'i' } }
                ]
            })
            .skip(skip) 
            .limit(limit); 
            const totalUsers = await User.countDocuments({
                isAdmin: false,
                $or: [
                    { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                    { email: { $regex: '.*' + search + '.*', $options: 'i' } }
                ]
            });
    
            const totalPages = Math.ceil(totalUsers / limit);
    
            res.render('admin/admin-users', { 
                title: 'Admin Users',
                layout: adminLayout,
                users: usersData,
                search: search,
                currentPage: page,
                totalPages: totalPages
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
                .populate({
                    path: 'products.productId',
                    select: 'name price' 
                })
                .populate('addressId', 'street city pincode');
    
            if (!order) {
                return res.status(404).send("Order not found");
            }
    
            
            order.products = order.products || [];
    
            res.render('admin/orderDetails', {
                order,
                title: 'Order Details',
                layout: adminLayout,
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
    getCouponCodes: async (req, res) => {
        try {
            if (!req.session.adminId) {
                return res.redirect('/admin/login');
            }

            const page = parseInt(req.query.page, 1) || 1;
            const limit = 10; 
            const skip = (page - 1) * limit;

            const couponCodes = await Coupon.find()
                .skip(skip)
                .limit(limit);

            const totalCoupons = await Coupon.countDocuments();

            const totalPages = Math.ceil(totalCoupons / limit);

            res.render('admin/coupon', {
                title: 'Coupon Codes',
                layout: adminLayout,
                coupons: couponCodes,
                currentPage: page,
                totalPages: totalPages,
            });
        } catch (error) {
            console.error('Error in getCouponCodes:', error.message);
            res.status(500).send("Internal Server Error");
        }
    },
    addCouponLoad: (req, res) => {
        // Render the add coupon page
        if (!req.session.adminId) {
            return res.redirect('/admin/login');
        }
        res.render('admin/addCoupon', {
            title: 'Add New Coupon',
            layout:adminLayout
            
        });
    },

    addCoupon: async (req, res) => {
        try {
            const { code, type, maxDiscount, description, limit, expiryDate } = req.body;

            const newCoupon = new Coupon({
                code,
                type,
                maxDiscount,
                description,
                limit,
                expirityDate: expiryDate
            });

            await newCoupon.save();

            req.flash('success', 'Coupon added successfully!');
            res.redirect('/admin/coupon'); 
        } catch (error) {
            console.error('Error adding coupon:', error.message);
            req.flash('error', 'Failed to add coupon. Please try again.');
            res.redirect('/admin/addCoupon'); 
    }
},
    removeCoupon: async (req, res) => {
        try {
          if (!req.session.adminId) {
            return res.redirect('/admin/login');
          }
      
          const couponId = req.params.id; 
          const coupon = await Coupon.findById(couponId);
      
          if (!coupon) {
            return res.status(404).redirect('/admin/coupons');
          }
      
          await Coupon.findByIdAndDelete(couponId); 
      
         
          res.redirect('/admin/coupon');
        } catch (error) {
          console.error('Error in removeCoupon:', error.message);
          res.status(500).redirect('/admin/coupons');
        }
      },
      
      SalesReport: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const search = req.query.search || '';
    
        
            const { startDate, endDate, presetFilter } = req.query;
            let dateFilter = {};
    
            if (presetFilter === 'today') {
                const today = new Date();
                dateFilter = { createdAt: { $gte: today.setHours(0, 0, 0, 0) } };
            } else if (presetFilter === 'week') {
                const startOfWeek = new Date();
                startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); 
                dateFilter = { createdAt: { $gte: startOfWeek } };
            } else if (presetFilter === 'month') {
                const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                dateFilter = { createdAt: { $gte: startOfMonth } };
            } else if (startDate && endDate) {
                dateFilter = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
            }
    
            
            const searchFilter = search
                ? {
                    $or: [
                        { 'userId.username': { $regex: search, $options: 'i' } },
                        { 'products.productName': { $regex: search, $options: 'i' } }
                    ]
                }
                : {};
    
            const orders = await Order.find({ ...searchFilter, ...dateFilter })
                .populate('userId', 'username')
                .populate('products.productId', 'name price')
                .skip(skip)
                .limit(limit);
    
            const totalOrders = await Order.countDocuments({ ...searchFilter, ...dateFilter });
            const totalPages = Math.ceil(totalOrders / limit);
    
            
            let totalSales = 0;
            let totalDiscount = 0;
            orders.forEach(order => {
                totalSales += order.totalAmount;
                totalDiscount += order.discount || 0;
            });
    
            res.render('admin/salesReport', {
                order: orders,
                admin: req.admin,
                layout: adminLayout,
                currentPage: page,
                totalPages: totalPages,
                totalSales,
                totalDiscount,
                totalOrders,
                search,
                limit
            });
        } catch (error) {
            console.error('Error fetching sales report:', error);
            res.status(500).send('Internal Server Error');
        }
    },
    
    
}
