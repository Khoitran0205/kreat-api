const conversation = require('../models/chat/conversation');
const Conversation = require('../models/chat/conversation');
const message = require('../models/chat/message');
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
  Conversation.find({ members: { $in: [decodedToken.id_account] } })
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
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  const newMessage = await Message({
    id_sender: decodedToken.id_account,
    id_conversation: req.body.id_conversation,
    messageContent: req.body.messageContent,
  });
  if (!req.body.id_conversation || !req.body.messageContent) {
    res.sendStatus(500);
  } else {
    await newMessage
      .save()
      .then((result) => {
        res.status(201).json({
          message: 'message sent successfully',
          message: result,
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: err,
        });
      });
  }
};

// [GET] /chat/:id/messages
exports.chat_get_all_message = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await Message.find({ id_conversation: req.params.id })
    .then((messages) => {
      res.status(200).json({
        message: 'get all messages successfully',
        messages,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};
