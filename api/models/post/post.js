const mongoose = require('mongoose');

const sharedPostSchema = mongoose.Schema(
  {
    shared_id_account: { type: mongoose.Types.ObjectId, default: null },
    shared_id_visualMedia: { type: Array, default: [] },
    shared_postContent: { type: String, default: '' },
    shared_postFeeling: { type: String, default: '' },
    shared_postPrivacy: { type: String, default: '' },
    shared_createdAt: { type: Date, default: '' },
    shared_id_friendTag: { type: Array, default: [] },
    shared_location: { type: String, default: '' },
  },
  {
    _id: false,
  },
);

const postSchema = mongoose.Schema(
  {
    id_account: { type: mongoose.Types.ObjectId, default: null },
    id_visualMedia: { type: Array, default: [] },
    postContent: { type: String, default: '' },
    postFeeling: { type: String, default: '' },
    postPrivacy: { type: String, default: '' },
    id_friendTag: { type: Array, default: [] },
    location: { type: String, default: '' },
    isShared: { type: Boolean, default: false },
    shareId: { type: mongoose.Types.ObjectId, default: null },
    shareContent: { type: sharedPostSchema, default: {} },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Post', postSchema);
