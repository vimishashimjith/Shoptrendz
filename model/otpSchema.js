const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600 // OTP expires in 10 minutes (600 seconds)
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OtpData", otpSchema);
