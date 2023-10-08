const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema(
  {
    members: { type: Array, default: [] },
    leader: { type: mongoose.Types.ObjectId, require: true },
    name: { type: String, default: '' },
    picture: { type: String, default: '' },
    status: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Conversation', conversationSchema);
