const Cart=require('../model/cartSchema')

const cartCount = async (req, res, next) => {
    if (req.session.user_id) {
        try {
            const cart = await Cart.findOne({ userId: req.session.user_id, active: true });
            const cartCount = cart ? cart.products.reduce((acc, product) => acc + product.quantity, 0) : 0;
            
         
            res.locals.cartCount = cartCount;
        } catch (error) {
            console.error('Error fetching cart count:', error);
            res.locals.cartCount = 0; 
        }
    } else {
        res.locals.cartCount = 0; 
    }
    next();
};

module.exports = cartCount;
