const WishList = require('../model/wishlistSchema'); 

const wishlistCount = async (req, res, next) => {
    if (req.session.user_id) {
        try {
           
            const wishlist = await WishList.findOne({ userId: req.session.user_id });
       
            const wishlistCount = wishlist 
                ? wishlist.products.length 
                : 0;
            res.locals.wishlistCount = wishlistCount;
        } catch (error) {
            console.error('Error fetching wishlist count:', error);
            res.locals.wishlistCount = 0; 
        }
    } else {
        res.locals.wishlistCount = 0; 
    }
    next(); 
};

module.exports = wishlistCount;
