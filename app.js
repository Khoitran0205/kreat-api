const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const connectToDb = require('./config/db/index');
const route = require('./api/routes/index');
const cors = require('cors')


//Connect to database
connectToDb();

//Adding middleware
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(
    cors({
        origin: '*'
    })
)
app.use(bodyParser.json());

//Define routes
route(app);

module.exports = app;