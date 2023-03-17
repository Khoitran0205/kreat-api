const mongoose = require('mongoose');

const accountSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        match: /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
    },
    password: { type: String, required: true },
    fullname: { type: String, required: true },
    gender: { type: String, required: true },
    avatar: { type: String, default: "" },
    aboutMe: { type: String, default: "" },
    birthday: { type: String, default: "" },
    liveIn: { type: String, default: "" },
    occupation: { type: String, default: "" },
    joinedAt: { type: String, default: "" },
    status: { type: String, default: "" },
    religion: { type: String, default: "" },
    hobbies: { type: Array, default: [] },
    favoriteTVShows: { type: Array, default: [] },
    favoriteMovies: { type: Array, default: [] },
    favoriteGames: { type: Array, default: [] },
    favoriteMusicBands: { type: Array, default: [] },
    favoriteBooks: { type: Array, default: [] },
    favoriteSports: { type: Array, default: [] },
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
    listFriend: { type: Array, default: [] }
})

module.exports = mongoose.model('Account', accountSchema);