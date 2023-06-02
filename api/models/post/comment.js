const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
    id_post: { type: mongoose.Types.ObjectId, required: true },
    id_account: { type: mongoose.Types.ObjectId, required: true },
    commentContent: { type: String, default: '' },
}, {
    timestamps: true,
})

module.exports = mongoose.model('Comment', commentSchema);