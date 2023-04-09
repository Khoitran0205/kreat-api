const mongoose = require('mongoose');

const Post = require('../models/post');
const Account = require('../models/user/account');

// [POST] /posts/post
exports.posts_create_post = (req, res, next) => {
    const post = new Post(req.body);
    Account.findById({ _id: req.body.id_account })
        .then(account => {
            if (!account) {
                return res.status(404).json({
                    message: 'Account not found!'
                })
            }
            if (!req.body.postContent) {
                return res.status(404).json({
                    message: 'content must be not empty!'
                })
            }
            post.save()
                .then(result => {
                    res.status(201).json({
                        message: "post created!",
                        post: result
                    })
                })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })
}