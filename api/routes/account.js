const express = require('express');
const router = express.Router();

const authenticateToken = require('../../middleware/auth');

const AccountController = require('../controllers/AccountController');

//Interact with account's info
router.get('/:id/timeline', authenticateToken, AccountController.accounts_get_timeline_info);
router.get('/:id/about', authenticateToken, AccountController.accounts_get_about_info);
router.get('/:id/friends', authenticateToken, AccountController.accounts_get_all_friends);
router.get('/:id/visual_media', authenticateToken, AccountController.accounts_get_visual_media_info);
router.get('/:id/avatar', authenticateToken, AccountController.accounts_get_all_avatars);

router.get('/tagged-in_post', authenticateToken, AccountController.accounts_get_tagged_in_posts);

router.patch('/update_personal_info', authenticateToken, AccountController.accounts_update_personal_info);
router.patch('/update_favorite_info', authenticateToken, AccountController.accounts_update_favorite_info);
router.patch('/update_education_info', authenticateToken, AccountController.accounts_update_education_info);
router.patch('/update_other_info', authenticateToken, AccountController.accounts_update_other_info);

//Search
router.get('/search', authenticateToken, AccountController.accounts_search_accounts);
router.get('/:id/friends/search', authenticateToken, AccountController.accounts_search_friends);

//Interact with account's friends
router.get('/friend_requests', authenticateToken, AccountController.accounts_get_all_friend_requests);
router.post('/send_friend_request', authenticateToken, AccountController.accounts_send_friend_request);
router.delete('/:id/cancel_friend_request', authenticateToken, AccountController.accounts_cancel_friend_request);
router.delete('/:id/accept_friend_request', authenticateToken, AccountController.accounts_accept_friend_request);
router.delete('/:id/decline_friend_request', authenticateToken, AccountController.accounts_decline_friend_request);
router.delete('/:id/unfriend', authenticateToken, AccountController.accounts_unfriend);

//Reaction
router.post('/react', authenticateToken, AccountController.accounts_react);
router.patch('/update_react', authenticateToken, AccountController.accounts_update_react);
router.delete('/:id/unreact_post', authenticateToken, AccountController.accounts_unreact_post);
router.delete('/:id/unreact_comment', authenticateToken, AccountController.accounts_unreact_comment);

//Comment
router.post('/comment_post', authenticateToken, AccountController.accounts_comment_post);
router.post('/reply_comment_post', authenticateToken, AccountController.accounts_reply_comment_post);
router.patch('/update_comment_post', authenticateToken, AccountController.accounts_update_comment_post);
router.delete('/:id/delete_comment_post', authenticateToken, AccountController.accounts_delete_comment_post);

//Friend suggestions
router.get('/friend_suggestion', authenticateToken, AccountController.accounts_get_friend_suggestions);

//Contacts
router.get('/contact', authenticateToken, AccountController.accounts_get_all_contacts);

// Notifications
router.get('/notification', authenticateToken, AccountController.accounts_get_all_notifications);
router.get(
  '/unviewed_notification_and_message',
  authenticateToken,
  AccountController.accounts_get_unviewed_notifications_and_messages,
);

// Password
router.post('/reset_password', authenticateToken, AccountController.reset_password);
router.post('/send_code', AccountController.send_code);
router.post('/reset_forgotten_password', AccountController.reset_forgotten_password);

// Settings
router.get('/setting', authenticateToken, AccountController.setting);
router.patch('/update_setting', authenticateToken, AccountController.update_setting);

module.exports = router;
