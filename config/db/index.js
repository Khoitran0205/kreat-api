const mongoose = require('mongoose');

const connect = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URL, {
      dbName: 'KreaT',
    });
    console.log('Connect to db successfully!');
  } catch (err) {
    console.log('Fail to connect to db!');
  }
};

module.exports = connect;
