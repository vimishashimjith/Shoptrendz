const isLogin = async (req, res, next) => {
    try {
        if (req.session.adminId) { 
            next(); 
        } else {
            res.redirect('/admin/login');  
        }
    } catch (error) {
        console.error('Error in isLogin middleware:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session.adminId) {  
            res.redirect('/admin/home'); 
        } else {
            next();
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
