const Conversation = require('../models/chat/conversation');
const Message = require('../models/chat/message');
const PersonalInfo = require('../models/user/personal_info');

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
        viewedBy: message.viewedBy,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      });
    }

    res.status(200).json({
      message: 'get all messages successfully',
      messages: listMessage,
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
      let groupChatPicture;
      if (req.body.picture) {
        const fileStr = req.body.picture;
        groupChatPicture = await cloudinary.uploader.upload(fileStr, {
          resource_type: 'image',
          upload_preset: 'groupChat_setups',
        });
      }
      if (conversation.picture !== 'group-chats/group_chat_wefjid.jpg')
        await cloudinary.uploader.destroy(conversation.picture);

      const updatedConversation = await Conversation.findOneAndUpdate(
        {
          _id: req.params.id,
        },
        {
          ...req.body,
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
