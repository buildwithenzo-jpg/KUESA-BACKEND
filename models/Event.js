const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    theme: { type: String, trim: true },
    description: { type: String, required: true },
    speakerName: { type: String, trim: true },
    speakerTitle: { type: String, trim: true },
    partnerOrg: { type: String, trim: true },
    eventDate: { type: Date, required: true },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    location: { type: String, trim: true }, // e.g. "Google Meet", "KU Main Campus"
    meetingLink: { type: String, trim: true },
    coverImage: { type: String },
    published: { type: Boolean, default: true },
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

module.exports = mongoose.model('Event', eventSchema);
module.exports.slugify = slugify;
