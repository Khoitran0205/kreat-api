const Conversation = require('../models/chat/conversation');
const Message = require('../models/chat/message');
const PersonalInfo = require('../models/user/personal_info');
const OtherInfo = require('../models/user/other_info');

const { cloudinary } = require('../../utils/cloudinary');

const jwt_decode = require('jwt-decode');

// [POST] /chat/create_conversation
exports.chat_create_conversation = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
  const newConversation = await Conversation({
    members: [decodedToken.id_account, req.body.id_account],
  });
  await newConversation
    .save()
    .then((result) => {
      res.status(201).json({
        message: 'conversation created successfully',
        conversation: result,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [GET] /chat/conversations
exports.chat_get_all_conversation = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const conversations = await Conversation.find({
      members: { $in: [decodedToken.id_account] },
    }).sort({
      updatedAt: -1,
    });
    let listConversation = [];
    for (const [index, conversation] of conversations.entries()) {
      let conversationContent = {};
      const [id_other_member] = conversation.members.filter((member) => member != decodedToken.id_account);
      const personalInfo = await PersonalInfo.findOne(
        { id_account: id_other_member },
        { _id: 0, avatar: 1, fullName: 1 },
      );
      const latestMessage = await Message.find({ id_conversation: conversation._id })
        .sort({
          createdAt: -1,
        })
        .limit(1);
      const senderName = await PersonalInfo.findOne({ id_account: latestMessage[0]?.id_sender }, { fullName: 1 });
      const shortName = senderName?.fullName.slice(senderName?.fullName.lastIndexOf(' ') + 1);

      if (latestMessage.length > 0 || conversation?.name) {
        conversationContent = {
          id_conversation: conversation._id,
          id_account: conversation?.name ? 'null' : id_other_member,
          leader: conversation?.leader,
          avatar: conversation?.picture ? conversation?.picture : personalInfo.avatar,
          fullName: conversation?.name ? conversation?.name : personalInfo.fullName,
          status: conversation.status,
          latestMessage: latestMessage[0]?.messageContent
            ? latestMessage[0]?.messageContent
            : `Welcome to group ${conversation?.name}`,
          latestMessageTime: latestMessage[0]?.createdAt ? latestMessage[0]?.createdAt : conversation?.createdAt,
          senderName: latestMessage[0]?.id_sender == decodedToken.id_account ? 'You' : shortName,
          isViewed: latestMessage[0]?.viewedBy.includes(decodedToken.id_account) ? true : false,
        };
        listConversation.push(conversationContent);
      }
    }
    listConversation.sort(function (a, b) {
      return b.latestMessageTime - a.latestMessageTime;
    });
    res.status(200).json({
      message: 'get all conversations successfully',
      listConversation,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [POST] /chat/send_message
exports.chat_send_message = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    if (!req.body.id_conversation || !req.body.messageContent) {
      res.sendStatus(500);
      return;
    }

    const conversation = await Conversation.findOne({ _id: req.body.id_conversation });
    if (!conversation.status) {
      res.status(403).json({
        message: 'you are not friends right now',
      });
      return;
    }

    const newMessage = new Message({
      id_sender: decodedToken.id_account,
      id_conversation: req.body.id_conversation,
      messageContent: req.body.messageContent,
      type: 'message',
      viewedBy: [decodedToken.id_account],
    });

    const result = await newMessage.save();
    await Conversation.findOneAndUpdate({ _id: req.body.id_conversation }, { isViewed: false });
    res.status(201).json({
      message: 'message sent successfully',
      newMessage: result,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [GET] /chat/:id/messages
exports.chat_get_all_message = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const conversation = await Conversation.findOne({ _id: req.params.id }, { leader: 1 });
    const messages = await Message.find({ id_conversation: req.params.id });
    if (messages[messages.length - 1].id_sender != decodedToken.id_account) {
      if (!messages[messages.length - 1].viewedBy.includes(decodedToken.id_account)) {
        await Message.findOneAndUpdate(
          {
            _id: messages[messages.length - 1]._id,
          },
          {
            viewedBy: [...messages[messages.length - 1].viewedBy, decodedToken.id_account],
          },
        );
      }
    }

    const listMessage = [];
    for (const [index, message] of messages.entries()) {
      const personalInfo = await PersonalInfo.findOne(
        {
          id_account: message.id_sender,
        },
        { avatar: 1, fullName: 1 },
      );
      listMessage.push({
        id: message._id,
        id_conversation: message.id_conversation,
        id_sender: message.id_sender,
        avatar: personalInfo.avatar,
        fullName: personalInfo.fullName,
        messageContent: message.messageContent,
        type: message.type,
        viewedBy: message.viewedBy,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      });
    }

    res.status(200).json({
      message: 'get all messages successfully',
      messages: listMessage,
      leader: conversation?.leader,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [POST] /chat/create_group_chat
exports.chat_create_group_chat = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    if (!req.body.name) {
      res.status(400).json({
        error: 'Name of the group chat cannot be empty',
      });
    } else {
      if (req.body.members?.length <= 1) {
        res.status(400).json({
          error: 'The number of members is not enough to create a group chat',
        });
      } else {
        let groupChatPicture;
        if (req.body.picture) {
          const fileStr = req.body.picture;
          groupChatPicture = await cloudinary.uploader.upload(fileStr, {
            resource_type: 'image',
            upload_preset: 'groupChat_setups',
          });
        }
        const newConversation = await Conversation({
          ...req.body,
          members: [...req.body.members, decodedToken.id_account],
          leader: decodedToken.id_account,
          picture: groupChatPicture ? groupChatPicture?.public_id : 'group-chats/group_chat_wefjid.jpg',
          status: true,
        });
        await newConversation.save();

        const personalInfo = await PersonalInfo.findOne({ id_account: decodedToken.id_account }, { fullName: 1 });

        const newNotiMessage = await new Message({
          id_conversation: newConversation._id,
          id_sender: decodedToken.id_account,
          messageContent: `The group chat has just been created by ${personalInfo.fullName}`,
          viewedBy: [decodedToken.id_account],
          type: 'notification',
        });
        await newNotiMessage.save();

        res.status(201).json({
          message: 'group chat created successfully',
          conversation: newConversation,
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [GET] /chat/get_all_members_group_chat/:id
exports.chat_get_all_members_group_chat = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    const conversation = await Conversation.findOne({ _id: req.params.id });
    if (!conversation) {
      res.status(401).json({
        error: 'Conversation not existed',
      });
    } else {
      const members = conversation.members;
      const listMember = [];
      for (const [index, member] of members?.entries()) {
        const personalInfo = await PersonalInfo.findOne({ id_account: member }, { avatar: 1, fullName: 1 });
        listMember.push({
          id: member,
          avatar: personalInfo.avatar,
          fullName: personalInfo.fullName,
          isLeader: conversation.leader == member ? true : false,
        });
      }

      listMember.sort((a, b) => {
        if (a.isLeader === true && b.isLeader === false) return -1;
        if (a.isLeader === false && b.isLeader === true) return 1;
        return 0;
      });

      res.status(200).json({
        message: 'get group chat members successfully',
        listMember: listMember.reverse(),
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [GET] /chat/get_all_friends_for_group_chat/:id
exports.chat_get_all_friends_for_group_chat = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    const conversation = await Conversation.findOne({ _id: req.params.id });
    if (!conversation) {
      res.status(401).json({
        error: 'Conversation not existed',
      });
    } else {
      const members = conversation.members;
      const { listFriend } = await OtherInfo.findOne({ id_account: decodedToken.id_account }, { listFriend: 1 });

      const listFriendForGroupChat = [];
      for (const [index, friend] of listFriend?.entries()) {
        const personalInfo = await PersonalInfo.findOne({ id_account: friend }, { avatar: 1, fullName: 1 });
        const isJoined = members.includes(friend.toString());
        listFriendForGroupChat.push({
          id_account: friend,
          avatar: personalInfo.avatar,
          fullName: personalInfo.fullName,
          isJoined,
        });
      }

      listFriendForGroupChat.sort((a, b) => {
        if (a.isJoined === true && b.isJoined === false) return 1;
        if (a.isJoined === false && b.isJoined === true) return -1;
        return 0;
      });

      res.status(200).json({
        message: 'get all friends for group chat successfully',
        listFriend: listFriendForGroupChat,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [PATCH] /chat/update_group_chat/:id
exports.chat_update_group_chat = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const conversation = await Conversation.findOne({ _id: req.params.id });
    if (conversation?.leader != decodedToken.id_account) {
      res.status(401).json({
        error: 'Unauthorized',
      });
    } else {
      let groupChatPicture = conversation?.picture;
      if (req.body.picture) {
        const fileStr = req.body.picture;
        groupChatPicture = await cloudinary.uploader.upload(fileStr, {
          resource_type: 'image',
          upload_preset: 'groupChat_setups',
        });
        if (conversation.picture !== 'group-chats/group_chat_wefjid.jpg')
          await cloudinary.uploader.destroy(conversation.picture);
      }

      let updatedMembers;
      const personalInfo = await PersonalInfo.findOne(
        { id_account: decodedToken.id_account },
        { fullName: 1, avatar: 1 },
      );
      if (req.body.member) {
        updatedMembers = await conversation?.members?.filter((member) => member != req.body.member);
        const deletedPersonalInfo = await PersonalInfo.findOne(
          { id_account: req.body.member },
          { fullName: 1, avatar: 1 },
        );
        const newNotiMessage = await new Message({
          id_conversation: req.params.id,
          id_sender: decodedToken.id_account,
          messageContent: `${deletedPersonalInfo?.fullName} has just been removed from the group chat by ${personalInfo.fullName}`,
          viewedBy: [decodedToken.id_account],
          type: 'notification',
        });
        await newNotiMessage.save();
      }
      if (req.body.name) {
        const newNotiMessage = await new Message({
          id_conversation: req.params.id,
          id_sender: decodedToken.id_account,
          messageContent: `The group chat name has just been changed to "${req.body.name}" by ${personalInfo.fullName}`,
          viewedBy: [decodedToken.id_account],
          type: 'notification',
        });
        await newNotiMessage.save();
      }

      if (req.body.picture) {
        const newNotiMessage = await new Message({
          id_conversation: req.params.id,
          id_sender: decodedToken.id_account,
          messageContent: `The group chat picture has just been changed by ${personalInfo.fullName}`,
          viewedBy: [decodedToken.id_account],
          type: 'notification',
        });
        await newNotiMessage.save();
      }

      const updatedConversation = await Conversation.findOneAndUpdate(
        {
          _id: req.params.id,
        },
        {
          ...req.body,
          picture: req.body.picture ? groupChatPicture?.public_id : groupChatPicture,
          members: req.body.member ? updatedMembers : conversation?.members,
        },
      );

      res.status(200).json({
        message: 'update successfully',
        updatedConversation,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [PATCH] /chat/add_members_group_chat/:id
exports.chat_add_members_group_chat = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const newMembers = req.body.newMembers;
    const conversation = await Conversation.findOne({ _id: req.params.id });
    const personalInfo = await PersonalInfo.findOne(
      { id_account: decodedToken.id_account },
      { fullName: 1, avatar: 1 },
    );
    for (let i = 0; i < newMembers?.length; i++) {
      const addedPersonalInfo = await PersonalInfo.findOne({ id_account: newMembers[i] }, { fullName: 1, avatar: 1 });
      const newNotiMessage = await new Message({
        id_conversation: req.params.id,
        id_sender: decodedToken.id_account,
        messageContent: `${addedPersonalInfo?.fullName} has just been added to the group chat by ${personalInfo.fullName}`,
        viewedBy: [decodedToken.id_account],
        type: 'notification',
      });
      await newNotiMessage.save();
    }

    const updatedConversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id },
      {
        members: [...conversation?.members, ...newMembers],
      },
    );

    res.status(200).json({
      message: 'update successfully',
      updatedConversation,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [PATCH] /chat/leave_group_chat/:id
exports.leave_group_chat = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const conversation = await Conversation.findOne({ _id: req.params.id });
    const listMember = conversation?.members;
    const updatedConversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id },
      {
        members: listMember.filter((member) => member != decodedToken.id_account),
      },
    );
    const personalInfo = await PersonalInfo.findOne(
      { id_account: decodedToken.id_account },
      { fullName: 1, avatar: 1 },
    );
    const newNotiMessage = await new Message({
      id_conversation: req.params.id,
      id_sender: decodedToken.id_account,
      messageContent: `${personalInfo?.fullName} has just left the group chat`,
      viewedBy: [decodedToken.id_account],
      type: 'notification',
    });
    await newNotiMessage.save();

    res.status(200).json({
      message: 'leave group chat successfully',
      updatedConversation,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};
