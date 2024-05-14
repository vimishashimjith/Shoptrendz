const User =require('../model/userSchema');
const bcrypt = require('bcrypt');
const bodyparser=require('body-parser')




const securePassword = async(password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash
    } catch (error) {
      console.log(error.message)        
    }
}


    

const loadRegister = async(req,res)=>{
 try{
    res.render('user/signup');
 }
 catch(error){
    console.log(error.message)
 }
}

const insertUser = async(req,res)=>{
    try {
        const username=req.body.email;
        const spassword = await securePassword(req.body.password)
        const user = new User({
            username:req.body.username,
            email:req.body.email,
            password:spassword,
            isAdmin:false

        });
        const userDatacheck=await User.findOne({email:email})
        console.log(userDatacheck);
        if(!userDatacheck){
        const userData = await user.save();
        if(userData){
            res.render('user/signup',{message:"Your registration has been successfully,please verify your email"})
        }else{
            res.render('user/signup',{message:"Your registration has been failed"})
        }
    }
    else{
        res.render('user/signup',{message:"That user already exists!!...Try Again"});
      
    }
    } catch (error) {
        console.log(error.message)
        
    }
}


//login user

const loginLoad = async(req,res)=>{
    try {

        res.render('user/login')
        
    } catch (error) {
        console.log(error.message)
    }
} 


const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userData = await User.findOne({ email });

        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (passwordMatch) {
                // Successful login
                return res.redirect('/user/index'); // Redirect to the user's dashboard or profile
            } else {
                // Incorrect password
                return res.render('user/login', { message: "Email or password is incorrect" });
            }
        } else {
            // User not found
            return res.render('user/login', { message: "Email or password is incorrect" });
        }
    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Internal Server Error"); // Handle server error
    }
};

const loadHome = async (req, res) => {
    try {
        res.render('user/index');
    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Internal Server Error"); // Handle server error
    }
};


module.exports = {
    loadRegister,
    insertUser,
    loginLoad,
    verifyLogin,
    loadHome
       

}