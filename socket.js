require('dotenv').config();
const connectToDb = require('./config/db/index');
const OtherInfo = require('./api/models/user/other_info');

const socketPort = process.env.SOCKETPORT;

connectToDb();

const io = require('socket.io')(socketPort, {
  cors: {
    origin: 'http://localhost:3001',
  },
});

console.log(`Socket server is listening on ${socketPort}...`);

let onlineUsers = [];

const addOnlineUser = (id_account, socketId) => {
  !onlineUsers.some((onlineUser) => onlineUser.id_account === id_account) && onlineUsers.push({ id_account, socketId });
};

const removeOnlineUser = (socketId) => {
  onlineUsers = onlineUsers.filter((onlineUser) => onlineUser.socketId !== socketId);
};

io.on('connection', (socket) => {
  socket.on('addUser', async (id_account) => {
    addOnlineUser(id_account, socket.id);
    const myListFriend = await OtherInfo.findOne({ id_account: id_account }, { _id: 0, listFriend: 1 });
    for (const [index, user] of onlineUsers.entries()) {
      let onlineFriends = [];
      if (myListFriend.listFriend.includes(user.id_account)) {
        onlineFriends = onlineUsers.filter((value) => myListFriend.listFriend.includes(value.id_account));
        io.to(user.socketId).emit('getUser', onlineFriends);
      }
    }
  });

  socket.on('disconnect', () => {
    removeOnlineUser(socket.id);
    io.emit('getUser', onlineUsers);
  });
});
