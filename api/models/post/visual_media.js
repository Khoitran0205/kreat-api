const mongoose = require('mongoose');

const urlSchema = mongoose.Schema(
  {
    visualType: { type: String, default: '' },
    visualUrl: { type: String, default: '' },
  },
  {
    _id: false,
  },
);

const visualMediaSchema = mongoose.Schema(
  {
    id_post: { type: mongoose.Types.ObjectId, default: null },
    id_account: { type: mongoose.Types.ObjectId, default: null },
    url: { type: urlSchema, default: {} },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Visual Media', visualMediaSchema);
