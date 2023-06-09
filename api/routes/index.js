const authRoutes = require('./auth');
const accountRoutes = require('./account');
const postRoutes = require('./post');
const cloudinaryRoutes = require('./cloudinary');

function route(app) {
  app.use('/auth', authRoutes);
  app.use('/accounts', accountRoutes);
  app.use('/posts', postRoutes);
  app.use('/cloudinary', cloudinaryRoutes);
}

module.exports = route;
