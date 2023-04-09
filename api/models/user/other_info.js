const mongoose = require('mongoose');

const otherInfo = mongoose.Schema({
    id_account: { type: mongoose.Types.ObjectId, required: true },
    hobbies: { type: Array, default: [] },
    listFriend: { type: Array, default: [] }
})

module.exports = mongoose.model('Other Info', otherInfo);