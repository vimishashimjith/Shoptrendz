
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















module.exports={
    isLogin,
    isLogout,
    isAuthenticated
 

  
    
}
