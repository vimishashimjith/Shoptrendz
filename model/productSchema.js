const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
  size: { type: String, required: true },
  stock: {
    type: Number,
    required: true,
    min: [0, 'Stock must be a non-negative number'],
    max: 200
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  sizes: [sizeSchema],  
  color: {
    type: String, 
    required: true
  },
  price: {
    type: Number,
    default: 1,
    min: [0, 'Price must be a positive number']
  },
  images: [{
    url: {
      type: String,
      required: true
    }
  }],
  softDelete: {
    type: Boolean,
    default: false
  },
  offer: {
    type: Number,
    default: 0,
    min: [0, 'Offer must be a non-negative number'],
    max: [100, 'Offer cannot exceed 100%']
  },
  offerStart: {
    type: Date
  },
  offerEnd: {
    type: Date
  }
}, { timestamps: true });


module.exports = mongoose.model('Product', productSchema);
