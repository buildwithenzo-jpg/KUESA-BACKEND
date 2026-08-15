const mongoose = require('mongoose');

const partnershipInquirySchema = new mongoose.Schema(
  {
    organizationName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['new', 'contacted', 'closed'],
      default: 'new',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PartnershipInquiry', partnershipInquirySchema);
