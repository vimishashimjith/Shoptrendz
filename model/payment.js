const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true // Corrected 'require' to 'required'
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Card-Payment', 'Bank-transfer', 'PayPal', 'Razorpay', 'Wallet'],
        required: true // Corrected 'require' to 'required'
    },
    amount: {
        type: Number,
        required: true // Corrected 'require' to 'required'
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        required: true // Corrected 'require' to 'required'
    },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
