const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Resource = require('../models/Resource');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

const uploadDir = path.join(__dirname, '..', 'uploads', 'resources');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.csv'];

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    if (allowedExtensions.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, Excel, PowerPoint, and CSV files are allowed'));
    }
  },
});

// GET /api/resources - list published resources
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { published: true };
    if (category) filter.category = category;

    const resources = await Resource.find(filter).sort({ createdAt: -1 });
    res.json({ resources });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// GET /api/resources/admin/all - all resources including unpublished (admin only)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });
    res.json({ resources });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// POST /api/resources - upload a new resource (admin only)
router.post('/', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, published } = req.body;

    if (!title || !req.file) {
      return res.status(400).json({ message: 'Title and a file are required.' });
    }

    const resource = await Resource.create({
      title,
      description,
      category: category || 'other',
      published: published === 'false' ? false : true,
      fileUrl: `/uploads/resources/${req.file.filename}`,
      fileName: req.file.originalname,
      fileType: path.extname(req.file.originalname).toLowerCase().replace('.', ''),
      fileSize: req.file.size,
    });

    res.status(201).json({ resource });
  } catch (error) {
    console.error('Create resource error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// PUT /api/resources/:id - update a resource's metadata or replace its file (admin only)
router.put('/:id', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found.' });

    const { title, description, category, published } = req.body;

    if (title) resource.title = title;
    if (description !== undefined) resource.description = description;
    if (category) resource.category = category;
    if (published !== undefined) resource.published = published !== 'false';

    if (req.file) {
      resource.fileUrl = `/uploads/resources/${req.file.filename}`;
      resource.fileName = req.file.originalname;
      resource.fileType = path.extname(req.file.originalname).toLowerCase().replace('.', '');
      resource.fileSize = req.file.size;
    }

    await resource.save();
    res.json({ resource });
  } catch (error) {
    console.error('Update resource error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// DELETE /api/resources/:id - delete a resource (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found.' });
    res.json({ message: 'Resource deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

module.exports = router;
