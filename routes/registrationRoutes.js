const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Registration = require('../models/Registration');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'mpesa-screenshots');
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (png, jpg, jpeg, webp) are allowed'));
    }
  },
});

// POST /api/registrations - submit a new member registration or renewal
router.post('/', upload.single('screenshot'), async (req, res) => {
  try {
    const { membershipType, fullName, email, phone, registrationNumber, mpesaCode } = req.body;

    if (!membershipType || !fullName || !email || !phone || !mpesaCode) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    const registration = await Registration.create({
      membershipType,
      fullName,
      email,
      phone,
      registrationNumber,
      mpesaCode,
      screenshotPath: req.file ? `/uploads/mpesa-screenshots/${req.file.filename}` : undefined,
    });

    res.status(201).json({
      message: 'Registration submitted successfully. We will verify your payment shortly.',
      id: registration._id,
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
