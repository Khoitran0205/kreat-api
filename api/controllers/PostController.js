const mongoose = require('mongoose');

const Post = require('../models/post/post');
const Account = require('../models/user/account');

// [POST] /posts/:id/create_post
exports.posts_create_post = (req, res, next) => {
    const post = new Post({
        id_account: req.params.id,
        ...req.body
    });
    Account.findById({ _id: req.params.id })
        .then(account => {
            if (!account) {
                return res.status(404).json({
                    message: 'Account not found!'
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