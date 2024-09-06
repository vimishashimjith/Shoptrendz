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
            }
        }
    ],
    totalAmount: {
        type: Number, 
        required: true 
    },
    paymentMethod: {
        type: String,
        required: true 
    },
    status: { 
        type: String,
        default: 'Pending' 
    },
    orderDate: {
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
