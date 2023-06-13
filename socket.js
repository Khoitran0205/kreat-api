const io = require('socket.io')(3002, {
  cors: {
    origin: 'http://localhost:3001',
  },
});

let onlineUsers = [];

const addOnlineUser = (id_account, socketId) => {
  !onlineUsers.some((onlineUser) => onlineUser.id_account === id_account) && onlineUsers.push({ id_account, socketId });
};

const removeOnlineUser = (socketId) => {
  onlineUsers = onlineUsers.filter((onlineUser) => onlineUser.socketId !== socketId);
};

io.on('connection', (socket) => {
  socket.on('addUser', (id_account) => {
    addOnlineUser(id_account, socket.id);
    io.emit('getUser', onlineUsers);
  });

  socket.on('disconnect', () => {
    removeOnlineUser(socket.id);
    io.emit('getUser', onlineUsers);
  });
});
