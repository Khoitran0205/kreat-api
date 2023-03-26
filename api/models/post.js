const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    id_account: { type: mongoose.Types.ObjectId, required: true },
    id_image: { type: Array, default: [] },
    postContent: { type: String, required: true },
    postType: { type: String, required: true }
}, {
    timestamps: true,
})

module.exports = mongoose.model('Post', postSchema);