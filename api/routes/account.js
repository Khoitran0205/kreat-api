const express = require('express');
const router = express.Router();

const AccountController = require('../controllers/AccountController');

//Interact with account's info
router.post('/signup', AccountController.accounts_create_account);
router.patch('/:id/update_personal_info', AccountController.accounts_update_personal_info);
router.patch('/:id/update_favorite_info', AccountController.accounts_update_favorite_info);
router.patch('/:id/update_education_info', AccountController.accounts_update_education_info);
router.patch('/:id/update_other_info', AccountController.accounts_update_other_info);

//Search account
router.get('/search', AccountController.accounts_search_accounts);

//Interact with account's friends
router.get('/:id/friends', AccountController.accounts_get_all_friends);

// Interact with a post
//Raaction
router.post('/:id/react_post', AccountController.accounts_react_post);
router.patch('/:id/update_react_post', AccountController.accounts_update_react_post);
router.delete('/:id/unreact_post', AccountController.accounts_unreact_post);

//Comment
router.post('/:id/comment_post', AccountController.accounts_comment_post);
router.patch('/:id/update_comment_post', AccountController.accounts_update_comment_post);
router.delete('/:id/delete_comment_post', AccountController.accounts_delete_comment_post);

module.exports = router;