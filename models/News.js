const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    summary: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    coverImage: { type: String },
    authorName: { type: String, trim: true, default: 'KUESA' },
    published: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = mongoose.model('News', newsSchema);
module.exports.slugify = slugify;
