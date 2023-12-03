require('dotenv').config();
const connectToDb = require('./config/db/index');
const PersonalInfo = require('./api/models/user/personal_info');
const OtherInfo = require('./api/models/user/other_info');
const notification = require('./api/models/notification');

const socketPort = process.env.SOCKETPORT;

connectToDb();

const io = require('socket.io')(socketPort, {
  cors: {
    origin: '*',
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

const removeLogoutUser = (id_account) => {
  onlineUsers = onlineUsers.filter((onlineUser) => onlineUser.id_account !== id_account);
};

const getOnlineUser = (id_account) => {
  return onlineUsers.find((user) => user.id_account === id_account);
};

// when a user connects
io.on('connection', (socket) => {
  socket.on('addUser', async (id_account) => {
    addOnlineUser(id_account, socket.id);
    const myListFriend = await OtherInfo.findOne({ id_account: id_account }, { _id: 0, listFriend: 1 });
    const myOnlineFriends = onlineUsers.filter((value) => myListFriend?.listFriend.includes(value.id_account));
    for (const [index, friend] of myOnlineFriends.entries()) {
      const otherListFriend = await OtherInfo.findOne({ id_account: friend.id_account }, { _id: 0, listFriend: 1 });
      const otherOnlineFriends = onlineUsers.filter((value) => otherListFriend?.listFriend.includes(value.id_account));
      io.to(friend.socketId).emit('getUser', otherOnlineFriends);
    }
    io.to(socket.id).emit('getUser', myOnlineFriends);
  });

  // get and send message
  socket.on('sendMessage', async ({ id_conversation, id_sender, id_receiver, messageContent }) => {
    const user = getOnlineUser(id_receiver);
    const senderInfo = await PersonalInfo.findOne({ id_account: id_sender }, { _id: 0, avatar: 1, fullName: 1 });
    io.to(user.socketId).emit('getMessage', {
      id_conversation,
      id_sender,
      avatar: senderInfo?.avatar,
      fullName: senderInfo?.fullName,
      messageContent,
    });
  });

  // get and send notification
  socket.on('sendNotification', async (id_notification_receivers) => {
    for (const [index, value] of id_notification_receivers.entries()) {
      const user = getOnlineUser(value);
      io.to(user.socketId).emit('getNotification');
    }
  });

  // call other user
  socket.on('callUser', async ({ id_conversation, id_sender, id_receiver, peerData }) => {
    const user = getOnlineUser(id_receiver);
    console.log(onlineUsers);
    const senderInfo = await PersonalInfo.findOne({ id_account: id_sender }, { _id: 0, avatar: 1, fullName: 1 });
    io.to(user.socketId).emit('getCall', {
      id_conversation,
      id_sender,
      avatar: senderInfo?.avatar,
      fullName: senderInfo?.fullName,
      peerData,
    });
  });

  // answer the call
  socket.on('answerCall', async ({ id_conversation, id_sender, id_receiver, peerData }) => {
    const user = getOnlineUser(id_receiver);
    const senderInfo = await PersonalInfo.findOne({ id_account: id_sender }, { _id: 0, avatar: 1, fullName: 1 });
    console.log(onlineUsers);
    io.to(user.socketId).emit('callAccepted', {
      id_conversation,
      id_sender,
      avatar: senderInfo?.avatar,
      fullName: senderInfo?.fullName,
      peerData,
    });
  });

  // when a user logouts
  socket.on('logout', async (id_account) => {
    const logoutUser = getOnlineUser(id_account);
    if (logoutUser) {
      const myListFriend = await OtherInfo.findOne({ id_account: logoutUser.id_account }, { _id: 0, listFriend: 1 });
      let onlineFriends = onlineUsers.filter((value) => myListFriend.listFriend.includes(value.id_account));
      removeLogoutUser(id_account);
      for (const [index, friend] of onlineFriends.entries()) {
        const otherListFriend = await OtherInfo.findOne({ id_account: friend.id_account }, { _id: 0, listFriend: 1 });
        const otherOnlineFriends = onlineUsers.filter((value) => otherListFriend.listFriend.includes(value.id_account));
        io.to(friend.socketId).emit('getUser', otherOnlineFriends);
      }
    }
  });

  // when a user disconnects
  socket.on('disconnect', async () => {
    const disconnectedUser = await onlineUsers.find((user) => user.socketId === socket.id);
    if (disconnectedUser) {
      const myListFriend = await OtherInfo.findOne(
        { id_account: disconnectedUser.id_account },
        { _id: 0, listFriend: 1 },
      );
      let onlineFriends = onlineUsers.filter((value) => myListFriend.listFriend.includes(value.id_account));
      removeOnlineUser(socket.id);
      for (const [index, friend] of onlineFriends.entries()) {
        const otherListFriend = await OtherInfo.findOne({ id_account: friend.id_account }, { _id: 0, listFriend: 1 });
        const otherOnlineFriends = onlineUsers.filter((value) => otherListFriend.listFriend.includes(value.id_account));
        io.to(friend.socketId).emit('getUser', otherOnlineFriends);
      }
    }
  });
});
