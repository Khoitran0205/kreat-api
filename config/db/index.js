const mongoose = require('mongoose');

const connect = async () => {
    try {
        const connect = await mongoose.connect(
            "mongodb+srv://mysocialnetwork:" +
            process.env.MONGO_PASS +
            "@social-network-kreat.myvii0l.mongodb.net/?retryWrites=true&w=majority",
            {
                dbName: "KreaT"
            }
        );
        console.log('Connect to db successfully!');
    }
    catch (err) {
        console.log('Fail to connect to db!');
    }
}

module.exports = connect;