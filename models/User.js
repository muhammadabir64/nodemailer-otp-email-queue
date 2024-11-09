const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  verificationToken: String,
  tokenExpiresAt: Date,
  emailVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);