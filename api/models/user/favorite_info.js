const mongoose = require('mongoose');

const favoriteInfo = mongoose.Schema({
    id_account: { type: mongoose.Types.ObjectId, required: true },
    favoriteTVShows: { type: Array, default: [] },
    favoriteMovies: { type: Array, default: [] },
    favoriteGames: { type: Array, default: [] },
    favoriteMusicBands: { type: Array, default: [] },
    favoriteBooks: { type: Array, default: [] },
    favoriteSports: { type: Array, default: [] },
})

module.exports = mongoose.model('Favorite Info', favoriteInfo);