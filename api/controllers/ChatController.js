const Conversation = require('../models/chat/conversation');
const Message = require('../models/chat/message');

const jwt_decode = require('jwt-decode');

// [POST] /chat/create_conversation
exports.chat_create_conversation = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
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
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await Conversation.find({ members: { $in: [decodedToken.id_account] } })
    .then((conversations) => {
      res.status(200).json({
        message: 'get all conversations successfully',
        conversations,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [POST] /chat/send_message
exports.chat_send_message = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    var decodedToken = jwt_decode(token);
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

    var decodedToken = jwt_decode(token);
    const messages = await Message.find({ id_conversation: req.params.id });
    if (messages[messages.length - 1].id_sender != decodedToken.id_account) {
      await Conversation.findOneAndUpdate({ _id: req.params.id }, { isViewed: true });
    }
    res.status(200).json({
      message: 'get all messages successfully',
      messages,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};
