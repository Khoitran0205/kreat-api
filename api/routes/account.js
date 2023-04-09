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

module.exports = router;