const express = require('express');
const router = express.Router();

const authenticateToken = require('../../middleware/auth');

const PostController = require('../controllers/PostController');

//Interact with post
router.post('/create_post', authenticateToken, PostController.posts_create_post);
router.post('/share_post', authenticateToken, PostController.posts_share_post);
router.patch('/update_post', authenticateToken, PostController.posts_update_post);
router.delete('/:id/delete_post', authenticateToken, PostController.posts_delete_post);

//Get all posts
router.get('/get_all_post/:page', authenticateToken, PostController.posts_get_all_post);

//Get post by id
router.get('/:id', authenticateToken, PostController.posts_get_post_by_id);

//Get all reactions of a post
router.get('/:id/get_all_reaction', authenticateToken, PostController.posts_get_all_reaction);

//Get all comments of a post
router.get('/:id/get_all_comment', authenticateToken, PostController.posts_get_all_comment);

//Get all tagged friends
router.get('/:id/get_all_tagged_friend', authenticateToken, PostController.posts_get_all_tagged_friend);

//Get all friends to tag
router.get('/get_all_friend_to_tag', authenticateToken, PostController.posts_get_all_friend_to_tag);

module.exports = router;
