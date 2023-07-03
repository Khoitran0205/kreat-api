const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    id_senders: { type: Array, default: [] },
    id_receiver: { type: mongoose.Types.ObjectId, require: true },
    id_post: { type: mongoose.Types.ObjectId, default: null },
    id_comment: { type: mongoose.Types.ObjectId, default: null },
    notificationType: { type: String, default: '' },
    notificationContent: { type: String, default: '' },
    notificationTime: { type: Date, default: null },
    isViewed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Notification', notificationSchema);
