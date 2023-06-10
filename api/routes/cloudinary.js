const express = require('express');
const router = express.Router();

const authenticateToken = require('../../middleware/auth');

const CloudinaryController = require('../controllers/CloudinaryController');

// Upload image
router.post('/upload', CloudinaryController.cloudinary_upload);
router.post('/delete_upload', CloudinaryController.cloudinary_delete_upload);

module.exports = router;
