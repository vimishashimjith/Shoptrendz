const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/userSchema'); 
const { request } = require('../app');
require('dotenv').config();

passport.serializeUser((user,done)=>{
    done(null,user._id);
})
passport.deserializeUser( async function(id,done){
    try {
        const user = await User.findById(id);
        done(null, user);  // Retrieve user from the database
    } catch (err) {
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
    passReqToCallback:true
}, 
async (request, accessToken, refreshToken, profile, done) => {
    try {
        
        console.log("Profile object:", profile);

      
        let user = await User.findOne({ googleId: profile.id });

        
        if (!user) {
            user = await User.create({
                googleId: profile.id,
                username: profile.displayName,
                email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : '',
                password: '',
                mobileno: '',
                isAdmin: false,
                isVerified: true,
                isBlocked: false,
                token: ''
            });
        }
        request.session.user = user;
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

module.exports = passport;
