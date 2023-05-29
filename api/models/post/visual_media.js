const mongoose = require('mongoose');

const visualMediaSchema = mongoose.Schema(
  {
    id_post: { type: mongoose.Types.ObjectId, default: null },
    url: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Visual Media', visualMediaSchema);
