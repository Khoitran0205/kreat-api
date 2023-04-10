const mongoose = require('mongoose');

const reactSchema = mongoose.Schema({
    reactType: { type: String, default: '' },
    id_post: { type: mongoose.Types.ObjectId, default: null },
    id_comment: { type: mongoose.Types.ObjectId, default: null },
    id_account: { type: mongoose.Types.ObjectId, required: true },
}, {
    timestamps: true,
})

module.exports = mongoose.model('React', reactSchema);