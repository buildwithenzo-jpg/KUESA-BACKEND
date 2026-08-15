const express = require('express');
const router = express.Router();
const PartnershipInquiry = require('../models/PartnershipInquiry');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

// POST /api/contact/partner - submit a Partner With Us inquiry
router.post('/partner', async (req, res) => {
  try {
    const { organizationName, contactName, email, phone, message } = req.body;

    if (!organizationName || !contactName || !email || !message) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    await PartnershipInquiry.create({
      organizationName,
      contactName,
      email,
      phone,
      message,
    });

    res.status(201).json({
      message: "Thanks for reaching out — we'll be in touch soon.",
    });
  } catch (error) {
    console.error('Partnership inquiry error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// GET /api/contact/partner/admin/all - view all inquiries (admin only)
router.get('/partner/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const inquiries = await PartnershipInquiry.find().sort({ createdAt: -1 });
    res.json({ inquiries });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

module.exports = router;
