const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const accountRoutes = require('./api/routes/account');

//Connect to database
mongoose.connect(
    "mongodb+srv://mysocialnetwork:" +
    process.env.MONGO_PASS +
    "@social-network-kreat.myvii0l.mongodb.net/?retryWrites=true&w=majority",
    {
        dbName: "KreaT"
    }
);

//Adding middleware
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(bodyParser.json());

//Define routes
app.use('/accounts', accountRoutes);

module.exports = app;