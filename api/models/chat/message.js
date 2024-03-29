const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
  {
    id_conversation: { type: mongoose.Types.ObjectId, require: true },
    id_sender: { type: mongoose.Types.ObjectId, require: true },
    messageContent: { type: String, require: true },
    viewedBy: { type: Array, default: [] },
    type: { type: String, default: 'message' },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Message', messageSchema);
