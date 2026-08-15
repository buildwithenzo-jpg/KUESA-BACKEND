const User = require('../models/User');

// Must be used AFTER `protect` middleware, since it relies on req.userId
async function adminOnly(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
}

module.exports = { adminOnly };
