const express = require('express');
const router = express.Router();

const AccountController = require('../controllers/AccountController');

router.post('/signup', AccountController.accounts_create_account);
router.get('/search', AccountController.accounts_search_accounts);

module.exports = router;