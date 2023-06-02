const express = require('express');
const router = express.Router();

const AccountController = require('../controllers/AccountController');

//Interact with account's info
router.get('/:id/timeline', AccountController.accounts_get_timeline_info);
router.get('/:id/about', AccountController.accounts_get_about_info);
router.get('/:id/friends', AccountController.accounts_get_all_friends);
// router.get('/:id/photos&videos', AccountController.accounts_get_visual_media_info);

router.patch('/:id/update_personal_info', AccountController.accounts_update_personal_info);
router.patch('/:id/update_favorite_info', AccountController.accounts_update_favorite_info);
router.patch('/:id/update_education_info', AccountController.accounts_update_education_info);
router.patch('/:id/update_other_info', AccountController.accounts_update_other_info);

//Search account
router.get('/search', AccountController.accounts_search_accounts);

//Interact with account's friends
router.get('/:id/friends/search', AccountController.accounts_search_friends);

//Reaction
router.post('/:id/react', AccountController.accounts_react);
router.patch('/:id/update_react', AccountController.accounts_update_react);
router.delete('/:id/unreact', AccountController.accounts_unreact);

//Comment
router.post('/:id/comment_post', AccountController.accounts_comment_post);
router.patch('/:id/update_comment_post', AccountController.accounts_update_comment_post);
router.delete('/:id/delete_comment_post', AccountController.accounts_delete_comment_post);

module.exports = router;
