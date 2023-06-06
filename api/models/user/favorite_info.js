const mongoose = require('mongoose');

const favoriteInfo = mongoose.Schema({
  id_account: { type: mongoose.Types.ObjectId, required: true },
  hobbies: { type: String, default: '' },
  favoriteTVShows: { type: String, default: '' },
  favoriteMovies: { type: String, default: '' },
  favoriteGames: { type: String, default: '' },
  favoriteMusicBands: { type: String, default: '' },
  favoriteBooks: { type: String, default: '' },
  favoriteSports: { type: String, default: '' },
});

module.exports = mongoose.model('Favorite Info', favoriteInfo);
