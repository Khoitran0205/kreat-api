const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema(
  {
    members: { type: Array, default: [] },
    leader: { type: mongoose.Types.ObjectId, require: true },
    name: { type: String, default: '' },
    picture: { type: String, default: 'group-chats/group_chat_wefjid.jpg' },
    status: { type: Boolean, default: false },
    isViewed: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Conversation', conversationSchema);
