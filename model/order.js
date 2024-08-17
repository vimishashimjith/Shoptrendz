const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema({
    orderId:{
        type:String,
        require:true
    },
    userId :{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        require:true,
    },
    address:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Address',
        require:true,
    },
    products :[{
        productId:
            {
                type:mongoose.Schema.Types.ObjectId,
                ref:'Product',
                require:true,
            },
        quantity:{
            type:Number,
            require:true,
        },
        size:{
            type:String,
            require:true
        },
        productStatus: {
            type: String,
            enum: ['Pending', 'Cancelled', 'Delivered'],
            default: 'Pending'
        },
        discount:{
            type:Number,
            require:true
        },
        price:{
            type:Number,
            require:true
        }
}],
    
},{timestamps:true});

module.exports = mongoose.model('Order',orderSchema);