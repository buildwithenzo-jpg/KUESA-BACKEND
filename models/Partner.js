const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    logo: { type: String },
    website: { type: String, trim: true },
    category: {
      type: String,
      enum: ['corporate', 'academic', 'media', 'other'],
      default: 'corporate',
    },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Partner', partnerSchema);
