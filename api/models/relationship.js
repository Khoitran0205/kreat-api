const mongoose = require('mongoose');

const relationshipSchema = mongoose.Schema({
    id_account1: { type: mongoose.Types.ObjectId, required: true },
    id_account2: { type: mongoose.Types.ObjectId, required: true },
    relationshipType: { type: Boolean, default: false }
}, {
    timestamps: true,
})

module.exports = mongoose.model('Relationship', relationshipSchema);