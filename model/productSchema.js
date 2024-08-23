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
     required: true },
  price: {
    type: Number,
    default: 1
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
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);