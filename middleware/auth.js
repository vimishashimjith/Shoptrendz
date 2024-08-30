const isLogin = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            // User is logged in, proceed to the next middleware
            return next();
        } else {
            // User is not logged in, redirect to login page
            return res.redirect('/login');
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server Error');
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            // User is logged in, redirect to home page
            return res.redirect('/');
        } 
        // User is not logged in, proceed to the next middleware
        return next();
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server Error');
    }
};

const isAuthenticated = (req, res, next) => {
    res.locals.isAuthenticated = !!req.session.user_id; // Converts user_id to boolean (true if exists)
    next();
};







module.exports={
    isLogin,
    isLogout,
    isAuthenticated,
  
    
}
