const mongoose = require('mongoose');

const accountSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      match:
        /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
    },
    password: { type: String, required: true },
    refreshToken: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    code: { type: String, default: '' },
    isBlocked: { type: Boolean, default: false },
    warningAmount: { type: Number, default: 0 },
  },
  {
    timestamps: {
      createdAt: 'joinedAt',
    },
  },
);

module.exports = mongoose.model('Account', accountSchema);
