const isLogin=async(req,res,next)=>{
    try {
      if(req.session.user_id){}  
      else{
        res.redirect('/login')
      }
      next();      
    } catch (error) {
        console.log(error.message)
        
    }
}

const isLogout=async(req,res,next)=>{
    try {
        if(req.session.user_id){
            res.redirect('/')
        } 
        next()
    } catch (error) {
        console.log(error.message)
        
    }
}
const isAuthenticated=(req,res,next)=>{
    if(req.session.user_id){
        res.locals.isAuthenticated=true;
    }else{
        res.locals.isAuthenticated=false
    }
    next();
}






module.exports={
    isLogin,
    isLogout,
    isAuthenticated,
  
    
}
