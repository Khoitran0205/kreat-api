const express = require('express');
const router = express.Router();

const PostController = require('../controllers/PostController');

//Create a new post
router.post('/:id/create_post', PostController.posts_create_post);
router.patch('/:id/update_post', PostController.posts_update_post);
router.delete('/:id/delete_post', PostController.posts_delete_post);

module.exports = router;