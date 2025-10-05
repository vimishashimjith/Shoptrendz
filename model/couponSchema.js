const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code:{type:String,
        require:true,
        unique: true
    },
    type:{
        type:String,
        require:true
    },
    maxDiscount:{
        type:Number,
        require:true
    },
    description:{
        type:String,
        require:true
    },
    limit:{
        type:Number,
        require:true
    },
    expirityDate:{
        type:Date,
        require:true,
    }

},{timestamps:true});
module.exports = mongoose.model('coupon',couponSchema);