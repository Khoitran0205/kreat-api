const express = require('express');
const router = express.Router();

const authenticateToken = require('../../middleware/auth');

const PostController = require('../controllers/PostController');

//Create a new post
router.post('/:id/create_post', PostController.posts_create_post);
router.patch('/:id/update_post', PostController.posts_update_post);
router.delete('/:id/delete_post', PostController.posts_delete_post);

//Get all posts
router.get('/:id/get_all_post', PostController.posts_get_all_post);

//Get all reactions of a post
router.get('/:id/get_all_reaction', authenticateToken, PostController.posts_get_all_reaction);

//Get all comment of a post
router.get('/:id/get_all_comment', PostController.posts_get_all_comment);

module.exports = router;