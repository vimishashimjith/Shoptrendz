const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true 
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Card-Payment', 'Bank-transfer', 'PayPal', 'Razorpay', 'Wallet'],
        required: true 
    },
    amount: {
        type: Number,
        required: true 
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        required: true 
    },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);