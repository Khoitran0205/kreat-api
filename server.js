const http = require('http');
const app = require('./app');
const env = require('dotenv')

env.config();

const port = process.env.Port || 3000;

const server = http.createServer(app);

server.listen(port, () => console.log(`Listening on port ${port}...`)); 