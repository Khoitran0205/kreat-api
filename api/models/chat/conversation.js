const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema(
  {
    members: { type: Array, default: [] },
    status: { type: Boolean, default: false },
    isViewed: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Conversation', conversationSchema);
