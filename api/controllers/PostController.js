const mongoose = require('mongoose');

const Post = require('../models/post/post');
const Account = require('../models/user/account');
const PersonalInfo = require('../models/user/personal_info');
const OtherInfo = require('../models/user/other_info');
const React = require('../models/post/react');
const Comment = require('../models/post/comment');
const other_info = require('../models/user/other_info');


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

// [PATCH] /posts/:id/update_post
exports.posts_update_post = (req, res, next) => {
    Post.findOneAndUpdate({
        id_account: req.params.id,
        _id: req.body.id_post
    }, req.body)
        .then(result => {
            if (!result) {
                return res.status(404).json({
                    message: 'Post not found!'
                })
            }
            res.status(200).json({
                message: 'post updated',
                post: result
            })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })
}

// [DELETE] /posts/:id/delete_post
exports.posts_delete_post = (req, res, next) => {
    Post.findOneAndRemove({
        id_account: req.params.id,
        _id: req.body.id_post
    })
        .then(result => {
            if (!result) {
                return res.status(404).json({
                    message: 'Post not found!'
                })
            }
            res.status(200).json({
                message: 'post removed',
                post: result
            })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })
}

// [GET] /posts/:id/get_all_post
exports.posts_get_all_post = (req, res, next) => {
    Post.find()
        .then(async listPost => {
            let list = listPost;
            for ([index, value] of list.entries()) {
                await React.find({ id_post: value._id }, { reactType: 1, id_account: 1 })
                    .then(async results => {
                        let listReaction = [];
                        for (result of results) {
                            await PersonalInfo.findOne({ id_account: result.id_account }, { fullName: 1, avatar: 1, reactType: result.reactType })
                                .then(personal_info => {
                                    listReaction.push(personal_info);
                                })
                        }
                        let post = list[index]
                        list[index] = {
                            post,
                            listReaction
                        }
                    })
                await Comment.find({ id_post: value._id })
                    .then(async results => {
                        list[index] = {
                            ...list[index],
                            amountComment: results.length
                        }
                    })
            }
            return await list;
        })
        .then(listPost => {
            res.status(200).json({
                message: "get all posts successfully",
                listPost: listPost
            })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })
}

// [GET] /posts/:id/get_all_reaction
exports.posts_get_all_reaction = (req, res, next) => {
    React.find({ id_post: req.body.id_post }, { id_account: 1, reactType: 1 })
        .then(async listReaction => {
            let list = [];
            for ([index, value] of listReaction.entries()) {
                let mutualFriends = [];
                await OtherInfo.findOne({ id_account: value.id_account }, { listFriend: 1 })
                    .then(async other_info => {
                        await OtherInfo.findOne({ id_account: req.params.id }, { listFriend: 1 })
                            .then(async result => {
                                mutualFriends = await result.listFriend.filter(value1 => {
                                    for (value2 of other_info.listFriend) {
                                        return value1 === value2;
                                    }
                                });
                            })
                    })
                await PersonalInfo.findOne({ id_account: value.id_account }, { avatar: 1, fullName: 1, reactType: value.reactType })
                    .then(async personal_info => {
                        if (value.id_account != req.params.id) {
                            const a = personal_info;
                            personal_info = {
                                reaction: a,
                                mutualFriends: mutualFriends.length
                            }
                        }
                        list.push(personal_info);
                    })
            }
            res.status(200).json({
                message: 'get all reactions successfully',
                listReaction: list
            })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })
}

// [GET] /posts/:id/get_all_comment
exports.posts_get_all_comment = (req, res, next) => {
    Comment.find({ id_post: req.body.id_post })
        .then(async listComment => {
            let list = [];
            for ([index, value] of listComment.entries()) {
                await PersonalInfo.findOne({ id_account: value.id_account }, { fullName: 1, avatar: 1, commentContent: value.commentContent })
                    .then(async result => {
                        await React.find({ id_comment: value._id }, { id_account: 1, reactType: 1 })
                            .then(async listReaction => {
                                let list = [];
                                for (reaction of listReaction) {
                                    await PersonalInfo.findOne({ id_account: reaction.id_account }, { avatar: 1, fullName: 1, reactType: reaction.reactType })
                                        .then(result => {
                                            list.push(result);
                                        })
                                }
                                result = {
                                    comment: result,
                                    listReaction: list
                                }
                            })
                        list.push(result)
                    })

            }
            res.status(200).json({
                message: 'get all comments successfully',
                listComment: list
            })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })
}