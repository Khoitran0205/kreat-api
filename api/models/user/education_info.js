const mongoose = require('mongoose');

const educationInfo = mongoose.Schema({
    id_account: { type: mongoose.Types.ObjectId, required: true },
    primarySchool: { type: String, default: "" },
    yearStartPrimarySchool: { type: Number, default: 0 },
    yearEndPrimarySchool: { type: Number, default: 0 },
    secondarySchool: { type: String, default: "" },
    yearStartSecondarySchool: { type: Number, default: 0 },
    yearEndSecondarySchool: { type: Number, default: 0 },
    highSchool: { type: String, default: "" },
    yearStartHighSchool: { type: Number, default: 0 },
    yearEndHighSchool: { type: Number, default: 0 },
    university: { type: String, default: "" },
    yearStartUniversity: { type: Number, default: 0 },
    yearEndUniversity: { type: Number, default: 0 },
})

module.exports = mongoose.model('Education Info', educationInfo);