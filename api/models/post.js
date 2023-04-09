const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    id_account: { type: mongoose.Types.ObjectId, required: true },
    id_image: { type: Array, default: [] },
    postContent: { type: String, required: true },
    postPrivacy: { type: String, required: true },
    id_friendTag: { type: Array, default: [] },
    location: { type: String, default: '' },
    isShare: { type: Boolean, default: false },
    shareId: { type: mongoose.Types.ObjectId, default: null }
}, {
    timestamps: true,
})

module.exports = mongoose.model('Post', postSchema);