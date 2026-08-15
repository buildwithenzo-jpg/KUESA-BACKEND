const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    membershipType: {
      type: String,
      enum: ['first-time', 'renewal'],
      required: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    registrationNumber: { type: String, trim: true },
    mpesaCode: { type: String, required: true, trim: true },
    screenshotPath: { type: String },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Registration', registrationSchema);
