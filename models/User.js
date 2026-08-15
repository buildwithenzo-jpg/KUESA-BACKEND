const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const KUESA_NUMBER_REGEX = /^KUESA-\d{4}-\d{4,6}$/;

const userSchema = new mongoose.Schema(
  {
    kuesaNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      match: [KUESA_NUMBER_REGEX, 'KUESA number must look like KUESA-2025-10279'],
    },
    fullName: { type: String, required: true, trim: true },
    memberType: {
      type: String,
      enum: ['student', 'alumni'],
      default: 'student',
    },
    graduationYear: { type: Number },
    currentOccupation: { type: String, trim: true },
    currentEmployer: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      // Not required for Google-authenticated accounts
      required: function () {
        return this.authProvider === 'local';
      },
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    membershipStatus: {
      type: String,
      enum: ['pending', 'active', 'expired'],
      default: 'pending',
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      default: 'member',
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    kuesaNumber: this.kuesaNumber,
    fullName: this.fullName,
    memberType: this.memberType,
    graduationYear: this.graduationYear,
    currentOccupation: this.currentOccupation,
    currentEmployer: this.currentEmployer,
    email: this.email,
    authProvider: this.authProvider,
    avatar: this.avatar,
    membershipStatus: this.membershipStatus,
    role: this.role,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.KUESA_NUMBER_REGEX = KUESA_NUMBER_REGEX;
