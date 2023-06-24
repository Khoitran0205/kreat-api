const express = require('express');
const router = express.Router();

const authenticateToken = require('../../middleware/auth');

const AuthController = require('../controllers/AuthController');

//Sign up
router.post('/signup', AuthController.auth_sign_up);

//Log in
router.post('/login', AuthController.auth_log_in);

//Log out
router.post('/logout', authenticateToken, AuthController.auth_log_out);

//Refresh token
router.post('/token', AuthController.auth_refresh_token);

//Send verification mail
router.post('/send_verification_mail', AuthController.send_verification_mail);

// Verify account
router.get('/verify/:id', AuthController.verify_account);

module.exports = router;
