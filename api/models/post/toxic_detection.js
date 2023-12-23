const mongoose = require('mongoose');

const toxicDetectionSchema = mongoose.Schema(
  {
    id_post: { type: mongoose.Types.ObjectId, default: null },
    id_comment: { type: mongoose.Types.ObjectId, default: null },
    id_account: { type: mongoose.Types.ObjectId, require: true },
    content: { type: String, default: '' },
    type: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Toxic Detection', toxicDetectionSchema);
