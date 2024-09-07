const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true, 
    },
    fullname: {
        type: String,
        required: true 
    },
    mobile: {
        type: Number,
        required: true, 
        validate: {
            validator: function(v) {
                return /^[0-9]{10}$/.test(v); 
            },
            message: props => `${props.value} is not a valid mobile number!`
        }
    },
    pincode: {
        type: Number,
        required: true, 
        validate: {
            validator: function(v) {
                return /^[0-9]{5,6}$/.test(v); 
            },
            message: props => `${props.value} is not a valid pincode!`
        }
    },
    street: {
        type: String,
        required: true 
    },
    city: {
        type: String,
        required: true 
    },
    state: {
        type: String,
        required: true 
    },
    country: {
        type: String,
        required: true, 
        default: 'India' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Address', addressSchema); 
