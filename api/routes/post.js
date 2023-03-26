const express = require('express');
const router = express.Router();

const PostController = require('../controllers/PostController');

router.post('/post', PostController.posts_create_post);

module.exports = router;