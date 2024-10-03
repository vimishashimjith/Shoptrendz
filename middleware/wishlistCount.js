const WishList = require('../model/wishlistSchema'); // Ensure this is the correct model

const wishlistCount = async (req, res, next) => {
    if (req.session.user_id) {
        try {
            // Find the user's wishlist based on their session user ID
            const wishlist = await WishList.findOne({ userId: req.session.user_id });
            
            // Calculate the total number of products in the wishlist
            const wishlistCount = wishlist 
                ? wishlist.products.length // Count the number of products in the wishlist
                : 0;

            // Store the wishlist count in res.locals for use in views
            res.locals.wishlistCount = wishlistCount;
        } catch (error) {
            console.error('Error fetching wishlist count:', error);
            res.locals.wishlistCount = 0; // Set count to 0 in case of an error
        }
    } else {
        res.locals.wishlistCount = 0; // Set count to 0 if the user is not logged in
    }
    next(); // Proceed to the next middleware/route handler
};

module.exports = wishlistCount;
