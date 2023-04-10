const express = require('express');
const router = express.Router();

const PostController = require('../controllers/PostController');

//Create a new post
router.post('/:id/create_post', PostController.posts_create_post);

module.exports = router;