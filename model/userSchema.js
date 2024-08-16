const mongoose = require('mongoose')

const {Schema} = mongoose

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    mobileno:{
        type: Number,
        required:false,
        unique:true,
        sparse:true,
        default:null,
    },
    googleId:{
       type:String,
       unique:true
    },
    password: {
        type: String,
        required: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    token:{
        type:String,
        default:''
    }
},{
    timestamps:true
})


module.exports = mongoose.model('User', userSchema)