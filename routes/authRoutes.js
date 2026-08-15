const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// POST /api/auth/register - sign up with KUESA number + password
router.post('/register', async (req, res) => {
  try {
    const {
      kuesaNumber,
      fullName,
      email,
      password,
      memberType,
      graduationYear,
      currentOccupation,
      currentEmployer,
    } = req.body;

    if (!kuesaNumber || !fullName || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all fields.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    if (memberType === 'alumni' && !graduationYear) {
      return res.status(400).json({ message: 'Please provide your graduation year.' });
    }

    const normalizedNumber = kuesaNumber.trim().toUpperCase();

    const existing = await User.findOne({
      $or: [{ kuesaNumber: normalizedNumber }, { email: email.trim().toLowerCase() }],
    });

    if (existing) {
      return res.status(409).json({
        message: 'An account with this KUESA number or email already exists.',
      });
    }

    const user = await User.create({
      kuesaNumber: normalizedNumber,
      fullName,
      email,
      password,
      authProvider: 'local',
      memberType: memberType === 'alumni' ? 'alumni' : 'student',
      graduationYear: memberType === 'alumni' ? graduationYear : undefined,
      currentOccupation,
      currentEmployer,
    });

    const token = signToken(user);
    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0]?.message || 'Invalid input.';
      return res.status(400).json({ message });
    }
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/login - log in with KUESA number + password
router.post('/login', async (req, res) => {
  try {
    const { kuesaNumber, password } = req.body;

    if (!kuesaNumber || !password) {
      return res.status(400).json({ message: 'Please enter your KUESA number and password.' });
    }

    const user = await User.findOne({ kuesaNumber: kuesaNumber.trim().toUpperCase() });

    if (!user || user.authProvider !== 'local' || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid KUESA number or password.' });
    }

    const token = signToken(user);
    res.json({ token, user: user.toSafeObject() });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/google - sign in / sign up with Google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Missing Google credential.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await User.findOne({ googleId: payload.sub });

    if (!user) {
      // Check if an account with this email already exists (e.g. registered locally)
      user = await User.findOne({ email: payload.email.toLowerCase() });

      if (user) {
        user.googleId = payload.sub;
        user.authProvider = 'google';
        user.avatar = payload.picture;
        await user.save();
      } else {
        // New Google user - still needs a KUESA number assigned before full access
        return res.status(202).json({
          message: 'No KUESA account found for this Google email. Please complete registration with your KUESA number.',
          needsKuesaNumber: true,
          googleProfile: {
            email: payload.email,
            fullName: payload.name,
            googleId: payload.sub,
            avatar: payload.picture,
          },
        });
      }
    }

    const token = signToken(user);
    res.json({ token, user: user.toSafeObject() });
  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }
});

// POST /api/auth/google/complete - finish Google sign-up by attaching a KUESA number
router.post('/google/complete', async (req, res) => {
  try {
    const {
      kuesaNumber,
      email,
      fullName,
      googleId,
      avatar,
      memberType,
      graduationYear,
      currentOccupation,
      currentEmployer,
    } = req.body;

    if (!kuesaNumber || !email || !fullName || !googleId) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    if (memberType === 'alumni' && !graduationYear) {
      return res.status(400).json({ message: 'Please provide your graduation year.' });
    }

    const normalizedNumber = kuesaNumber.trim().toUpperCase();

    const existing = await User.findOne({ kuesaNumber: normalizedNumber });
    if (existing) {
      return res.status(409).json({ message: 'This KUESA number is already registered.' });
    }

    const user = await User.create({
      kuesaNumber: normalizedNumber,
      fullName,
      email,
      googleId,
      avatar,
      authProvider: 'google',
      memberType: memberType === 'alumni' ? 'alumni' : 'student',
      graduationYear: memberType === 'alumni' ? graduationYear : undefined,
      currentOccupation,
      currentEmployer,
    });

    const token = signToken(user);
    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0]?.message || 'Invalid input.';
      return res.status(400).json({ message });
    }
    console.error('Google complete error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// GET /api/auth/me - get current logged-in user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: user.toSafeObject() });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

module.exports = router;
