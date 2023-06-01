const express = require('express');
const router = express.Router();

const authenticateToken = require('../../middleware/auth');

const PostController = require('../controllers/PostController');

//Create a new post
router.post('/create_post', authenticateToken, PostController.posts_create_post);
router.patch('/update_post', authenticateToken, PostController.posts_update_post);
router.delete('/delete_post', authenticateToken, PostController.posts_delete_post);

//Get all posts
router.get('/:id/get_all_post', authenticateToken, PostController.posts_get_all_post);

//Get all reactions of a post
router.get('/:id/get_all_reaction', PostController.posts_get_all_reaction);

//Get all comment of a post
router.get('/:id/get_all_comment', PostController.posts_get_all_comment);

module.exports = router;
