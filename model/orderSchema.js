const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    addressId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address', 
        required: true 
    },
    products: [
        {
            productId: { 
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true 
            },
            quantity: { 
                type: Number,
                required: true 
            },
            size:{
                type:String,
                required:true
            }
           
        },
       
    ],
    totalAmount: {
        type: Number, 
        required: true 
    },
    paymentMethod: {
        type: String,
        required: true 
    },
    paymentId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        default: null 
    },
    status: { 
        type: String,
        default: 'Pending' 
    },
    orderDate: {
        type: Date, 
        default: Date.now 
    },
    cancellationReason: { type: String, default: null },
    isCancellationRequested: { type: Boolean, default: false },
    isCancellationApproved: { type: Boolean, default: null },
}, {
    timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
