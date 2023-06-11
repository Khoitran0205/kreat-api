const express = require('express');
const router = express.Router();

const authenticateToken = require('../../middleware/auth');

const ChatController = require('../controllers/ChatController');

// Conversation
router.post('/create_conversation', authenticateToken, ChatController.chat_create_conversation);
router.get('/conversations', authenticateToken, ChatController.chat_get_all_conversation);

// Message
router.post('/send_message', authenticateToken, ChatController.chat_send_message);
router.get('/:id/messages', authenticateToken, ChatController.chat_get_all_message);

module.exports = router;
