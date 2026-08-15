const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
      type: String,
      enum: ['research', 'csr', 'report', 'guide', 'other'],
      default: 'other',
    },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resource', resourceSchema);
