const mongoose = require('mongoose');

const personalInfo = mongoose.Schema({
  id_account: { type: mongoose.Types.ObjectId, required: true },
  avatar: {
    type: String,
    default:
      'https://banner2.cleanpng.com/20180802/icj/kisspng-user-profile-default-computer-icons-network-video-the-foot-problems-of-the-disinall-foot-care-founde-5b6346121ec769.0929994515332326581261.jpg',
  },
  fullName: { type: String, default: '' },
  gender: { type: String, default: '' },
  aboutMe: { type: String, default: '' },
  birthday: { type: String, default: '' },
  liveIn: { type: String, default: '' },
  occupation: { type: String, default: '' },
  joined: { type: String, default: '' },
  religion: { type: String, default: '' },
  maritalStatus: { type: String, default: '' },
});

module.exports = mongoose.model('Personal Info', personalInfo);
