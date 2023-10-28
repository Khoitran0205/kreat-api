const mongoose = require('mongoose');

const setting = mongoose.Schema({
  id_account: { type: mongoose.Types.ObjectId, required: true },
  postDisplay: { type: String, default: 'slider' },
});

module.exports = mongoose.model('Setting', setting);
