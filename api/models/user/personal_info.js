const mongoose = require('mongoose');

const personalInfo = mongoose.Schema({
  id_account: { type: mongoose.Types.ObjectId, required: true },
  avatar: {
    type: String,
    default: 'avatars/ava_hivhix.png',
  },
  fullName: { type: String, default: '' },
  gender: { type: String, default: '' },
  aboutMe: { type: String, default: '' },
  birthday: { type: String, default: '' },
  liveIn: { type: String, default: '' },
  occupation: { type: String, default: '' },
  joined: { type: Date, default: null },
  religion: { type: String, default: '' },
  maritalStatus: { type: String, default: '' },
});

module.exports = mongoose.model('Personal Info', personalInfo);
