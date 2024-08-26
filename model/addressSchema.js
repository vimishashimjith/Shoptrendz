const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true, // Corrected spelling
    },
    fullname: {
        type: String,
        required: true // Corrected spelling
    },
    mobile: {
        type: Number,
        required: true, // Corrected spelling
        validate: {
            validator: function(v) {
                return /^[0-9]{10}$/.test(v); // Example: Mobile number validation for 10 digits
            },
            message: props => `${props.value} is not a valid mobile number!`
        }
    },
    pincode: {
        type: Number,
        required: true, // Corrected spelling
        validate: {
            validator: function(v) {
                return /^[0-9]{5,6}$/.test(v); // Example: Pincode validation for 5 or 6 digits
            },
            message: props => `${props.value} is not a valid pincode!`
        }
    },
    street: {
        type: String,
        required: true // Corrected spelling
    },
    city: {
        type: String,
        required: true // Corrected spelling
    },
    state: {
        type: String,
        required: true // Corrected spelling
    },
    country: {
        type: String,
        required: true, // Corrected spelling
        default: 'India' // Assuming default country is India
    }
}, { timestamps: true });

module.exports = mongoose.model('Address', addressSchema); // Model name in PascalCase
