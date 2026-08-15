const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Partner = require('../models/Partner');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

const uploadDir = path.join(__dirname, '..', 'uploads', 'partner-logos');
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
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (png, jpg, jpeg, webp, svg) are allowed'));
    }
  },
});

// GET /api/partners - list published partners
router.get('/', async (req, res) => {
  try {
    const partners = await Partner.find({ published: true }).sort({ name: 1 });
    res.json({ partners });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// GET /api/partners/admin/all - all partners including unpublished (admin only)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const partners = await Partner.find().sort({ createdAt: -1 });
    res.json({ partners });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// POST /api/partners - create a partner (admin only)
router.post('/', protect, adminOnly, upload.single('logo'), async (req, res) => {
  try {
    const { name, description, website, category, published } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Partner name is required.' });
    }

    const partner = await Partner.create({
      name,
      description,
      website,
      category: category || 'corporate',
      published: published === 'false' ? false : true,
      logo: req.file ? `/uploads/partner-logos/${req.file.filename}` : undefined,
    });

    res.status(201).json({ partner });
  } catch (error) {
    console.error('Create partner error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// PUT /api/partners/:id - update a partner (admin only)
router.put('/:id', protect, adminOnly, upload.single('logo'), async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ message: 'Partner not found.' });

    const { name, description, website, category, published } = req.body;

    if (name) partner.name = name;
    if (description !== undefined) partner.description = description;
    if (website !== undefined) partner.website = website;
    if (category) partner.category = category;
    if (published !== undefined) partner.published = published !== 'false';
    if (req.file) partner.logo = `/uploads/partner-logos/${req.file.filename}`;

    await partner.save();
    res.json({ partner });
  } catch (error) {
    console.error('Update partner error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// DELETE /api/partners/:id - delete a partner (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id);
    if (!partner) return res.status(404).json({ message: 'Partner not found.' });
    res.json({ message: 'Partner deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

module.exports = router;
