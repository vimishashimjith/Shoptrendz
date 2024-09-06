const isLogin = async (req, res, next) => {
    try {
        if (req.session.adminId) {  // Check if the session is for an admin user
            next();  // User is logged in and is an admin, proceed
        } else {
            res.redirect('/admin/login');  // Not logged in as admin, redirect to login
        }
    } catch (error) {
        console.error('Error in isLogin middleware:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session.adminId) {  // Check if the session is for an admin user
            res.redirect('/admin/home');  // User is already logged in as admin, redirect to home
        } else {
            next();  // No admin session, proceed to login
        }
    } catch (error) {
        console.error('Error in isLogout middleware:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    isLogin,
    isLogout
};
