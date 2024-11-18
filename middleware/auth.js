const User = require('../model/userSchema'); 

const isLogin = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            return next();
        } else {
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
            return res.redirect('/');
        }
        return next();
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server Error');
    }
};

const isAuthenticated = (req, res, next) => {
    res.locals.isAuthenticated = !!req.session.user_id;
    next();
};

const isBlocked = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            const user = await User.findById(req.session.user_id);

            if (user && user.isBlocked) {
                return res.status(403).render('user/404', {
                    message: 'Your account has been blocked by the admin. Please contact support.',
                });
            }
        }
        next(); 
    } catch (error) {
        console.error("Error checking user's blocked status:", error.message);
        return res.status(500).render('user/500', { message: 'An error occurred. Please try again later.' });
    }
};

module.exports = {
    isLogin,
    isLogout,
    isAuthenticated,
    isBlocked, 
};
