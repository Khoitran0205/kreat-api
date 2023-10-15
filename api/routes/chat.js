const express = require('express');
const router = express.Router();

const authenticateToken = require('../../middleware/auth');

const ChatController = require('../controllers/ChatController');

//Conversation
router.post('/create_conversation', authenticateToken, ChatController.chat_create_conversation);
router.get('/conversations', authenticateToken, ChatController.chat_get_all_conversation);

//Message
router.post('/send_message', authenticateToken, ChatController.chat_send_message);
router.get('/:id/messages', authenticateToken, ChatController.chat_get_all_message);

// Group chat
router.post('/create_group_chat', authenticateToken, ChatController.chat_create_group_chat);
router.get('/get_all_members_group_chat/:id', authenticateToken, ChatController.chat_get_all_members_group_chat);
router.get(
  '/get_all_friends_for_group_chat/:id',
  authenticateToken,
  ChatController.chat_get_all_friends_for_group_chat,
);
router.patch('/update_group_chat/:id', authenticateToken, ChatController.chat_update_group_chat);
router.patch('/add_members_group_chat/:id', authenticateToken, ChatController.chat_add_members_group_chat);
router.patch('/leave_group_chat/:id', authenticateToken, ChatController.leave_group_chat);

module.exports = router;
