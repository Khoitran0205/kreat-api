const mongoose = require('mongoose');

const friendRequestSchema = mongoose.Schema(
  {
    id_sender: { type: mongoose.Types.ObjectId, required: true },
    id_receiver: { type: mongoose.Types.ObjectId, required: true },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Friend Request', friendRequestSchema);
