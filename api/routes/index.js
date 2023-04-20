const accountRoutes = require('./account');
const postRoutes = require('./post');

function route(app) {
    app.use('/accounts', accountRoutes);
    app.use('/posts', postRoutes);
}

module.exports = route;