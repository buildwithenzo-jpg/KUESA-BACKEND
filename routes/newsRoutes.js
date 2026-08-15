const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const News = require('../models/News');
const { slugify } = require('../models/News');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

const uploadDir = path.join(__dirname, '..', 'uploads', 'news-covers');
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

// GET /api/news - list published articles (newest first)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    const articles = await News.find({ published: true })
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-content');

    const total = await News.countDocuments({ published: true });

    res.json({ articles, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// GET /api/news/admin/all - list ALL articles including drafts (admin only)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const articles = await News.find().sort({ createdAt: -1 });
    res.json({ articles });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// GET /api/news/:slug - get a single published article
router.get('/:slug', async (req, res) => {
  try {
    const article = await News.findOne({ slug: req.params.slug, published: true });
    if (!article) return res.status(404).json({ message: 'Article not found.' });
    res.json({ article });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// POST /api/news - create a new article (admin only)
router.post('/', protect, adminOnly, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, summary, content, authorName, published } = req.body;

    if (!title || !summary || !content) {
      return res.status(400).json({ message: 'Title, summary, and content are required.' });
    }

    let slug = slugify(title);
    const existing = await News.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now().toString().slice(-5)}`;

    const article = await News.create({
      title,
      slug,
      summary,
      content,
      authorName: authorName || 'KUESA',
      published: published === 'false' ? false : true,
      coverImage: req.file ? `/uploads/news-covers/${req.file.filename}` : undefined,
      publishedAt: new Date(),
    });

    res.status(201).json({ article });
  } catch (error) {
    console.error('Create news error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// PUT /api/news/:id - update an article (admin only)
router.put('/:id', protect, adminOnly, upload.single('coverImage'), async (req, res) => {
  try {
    const article = await News.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found.' });

    const { title, summary, content, authorName, published } = req.body;

    if (title && title !== article.title) {
      article.title = title;
      let newSlug = slugify(title);
      const existing = await News.findOne({ slug: newSlug, _id: { $ne: article._id } });
      if (existing) newSlug = `${newSlug}-${Date.now().toString().slice(-5)}`;
      article.slug = newSlug;
    }

    if (summary) article.summary = summary;
    if (content) article.content = content;
    if (authorName) article.authorName = authorName;
    if (published !== undefined) article.published = published !== 'false';
    if (req.file) article.coverImage = `/uploads/news-covers/${req.file.filename}`;

    await article.save();
    res.json({ article });
  } catch (error) {
    console.error('Update news error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// DELETE /api/news/:id - delete an article (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const article = await News.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found.' });
    res.json({ message: 'Article deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

module.exports = router;
