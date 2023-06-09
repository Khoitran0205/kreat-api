const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const connectToDb = require('./config/db/index');
const route = require('./api/routes/index');
const cors = require('cors');

//Connect to database
connectToDb();

//Adding middleware
app.use(morgan('dev'));
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    return res.status(200).json({});
  }
  next();
});

app.use(
  cors({
    origin: '*',
  }),
);

app.use(bodyParser.json());

//Define routes
route(app);

module.exports = app;
