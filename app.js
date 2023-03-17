const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

//Connect to database
mongoose.connect(
    "mongodb+srv://mysocialnetwork:" +
    process.env.MONGO_PASS +
    "@social-network-kreat.myvii0l.mongodb.net/?retryWrites=true&w=majority",
    {
        useMongoClient: true
    }
);

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json());

app.use('/', (req, res, next) => {
    res.status(200).json({
        message: 'hello world'
    });
})

module.exports = app;