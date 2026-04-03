// Blacklist model - stores JWT tokens that have been logged out
// 
// JWT tokens are normally valid until they expire, but when a user logs out
// we need a way to invalidate them early.
// Solution: save the token here and reject it on every request.

const mongoose = require('mongoose');

const blacklistTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, 'Token is required']
    }
  },
  {
    timestamps: true  // lets us know when the logout happened
  }
);

const BlacklistToken = mongoose.model('BlacklistToken', blacklistTokenSchema);

module.exports = BlacklistToken;