const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Event = require('../models/Event');
const { slugify } = require('../models/Event');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

const uploadDir = path.join(__dirname, '..', 'uploads', 'event-covers');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (png, jpg, jpeg, webp) are allowed'));
    }
  },
});

// GET /api/events - list published events, split into upcoming and past
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const upcoming = await Event.find({ published: true, eventDate: { $gte: now } }).sort({
      eventDate: 1,
    });
    const past = await Event.find({ published: true, eventDate: { $lt: now } }).sort({
      eventDate: -1,
    });
    res.json({ upcoming, past });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// GET /api/events/admin/all - all events including drafts (admin only)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const events = await Event.find().sort({ eventDate: -1 });
    res.json({ events });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// GET /api/events/:slug - single published event
router.get('/:slug', async (req, res) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug, published: true });
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    res.json({ event });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// POST /api/events - create an event (admin only)
router.post('/', protect, adminOnly, upload.single('coverImage'), async (req, res) => {
  try {
    const {
      title,
      theme,
      description,
      speakerName,
      speakerTitle,
      partnerOrg,
      eventDate,
      startTime,
      endTime,
      location,
      meetingLink,
      published,
    } = req.body;

    if (!title || !description || !eventDate) {
      return res.status(400).json({ message: 'Title, description, and event date are required.' });
    }

    let slug = slugify(title);
    const existing = await Event.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now().toString().slice(-5)}`;

    const event = await Event.create({
      title,
      slug,
      theme,
      description,
      speakerName,
      speakerTitle,
      partnerOrg,
      eventDate,
      startTime,
      endTime,
      location,
      meetingLink,
      published: published === 'false' ? false : true,
      coverImage: req.file ? `/uploads/event-covers/${req.file.filename}` : undefined,
    });

    res.status(201).json({ event });
  } catch (error) {
    console.error('Create event error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// PUT /api/events/:id - update an event (admin only)
router.put('/:id', protect, adminOnly, upload.single('coverImage'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const fields = [
      'title',
      'theme',
      'description',
      'speakerName',
      'speakerTitle',
      'partnerOrg',
      'eventDate',
      'startTime',
      'endTime',
      'location',
      'meetingLink',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) event[field] = req.body[field];
    });

    if (req.body.title && req.body.title !== event.title) {
      let newSlug = slugify(req.body.title);
      const existing = await Event.findOne({ slug: newSlug, _id: { $ne: event._id } });
      if (existing) newSlug = `${newSlug}-${Date.now().toString().slice(-5)}`;
      event.slug = newSlug;
    }

    if (req.body.published !== undefined) event.published = req.body.published !== 'false';
    if (req.file) event.coverImage = `/uploads/event-covers/${req.file.filename}`;

    await event.save();
    res.json({ event });
  } catch (error) {
    console.error('Update event error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// DELETE /api/events/:id - delete an event (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    res.json({ message: 'Event deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

module.exports = router;
