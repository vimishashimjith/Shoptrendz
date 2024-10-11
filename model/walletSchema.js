const mongoose = require('mongoose')

const {Schema} = mongoose
const WalletSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    transactions: [
      {
        type: {
          type: String,
          enum: ['Referral', 'OrderRefund'],  // Allowing specific types of transactions
          required: true
        },
        amount: {
          type: Number,
          required: true
        },
        date: {
          type: Date,
          default: Date.now
        }
      }
    ],
    modifiedOn: {
      type: Date,
      default: Date.now
    }
  }, { timestamps: true });
  
  module.exports = mongoose.model("Wallet", WalletSchema);
  