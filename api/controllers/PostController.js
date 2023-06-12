const Post = require('../models/post/post');
const Account = require('../models/user/account');
const PersonalInfo = require('../models/user/personal_info');
const OtherInfo = require('../models/user/other_info');
const React = require('../models/post/react');
const Comment = require('../models/post/comment');
const VisualMedia = require('../models/post/visual_media');

const { cloudinary } = require('../../utils/cloudinary');

const jwt_decode = require('jwt-decode');

// [POST] /posts/create_post
exports.posts_create_post = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await Account.findOne({ _id: decodedToken.id_account })
    .then(async (account) => {
      if (!account) {
        return res.status(404).json({
          message: 'Account not found!',
        });
      } else {
        let id_visualMedia = [];
        if (req.body.visualData) {
          const fileStr = req.body.visualData;
          for ([index, url] of fileStr.entries()) {
            if (url.type == 'image') {
              let uploadedResponse = await cloudinary.uploader.upload(url.data, {
                resource_type: 'image',
                upload_preset: 'dev_setups',
              });
              id_visualMedia.push({
                type: 'image',
                url: uploadedResponse.public_id,
              });
            } else {
              if (url.type == 'video') {
                let uploadedResponse = await cloudinary.uploader.upload(url.data, {
                  resource_type: 'video',
                  upload_preset: 'dev_setups',
                });
                id_visualMedia.push({
                  type: 'video',
                  url: uploadedResponse.public_id,
                });
              }
            }
          }
        }
        const post = await new Post({
          id_account: account._id,
          id_visualMedia,
          ...req.body,
        });
        await post
          .save()
          .then(async (result) => {
            if (result.id_visualMedia) {
              for ([index, value] of result.id_visualMedia.entries()) {
                let visualMedia = await new VisualMedia({
                  id_post: result._id,
                  id_account: account._id,
                  url: {
                    visualType: value.type,
                    visualUrl: value.url,
                  },
                });
                await visualMedia.save();
              }
            }
            await res.status(201).json({
              message: 'post created!',
              post: result,
            });
          })
          .catch((err) => {
            res.status(500).json({
              error: err,
            });
          });
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [POST] /posts/share_post
exports.posts_share_post = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await Account.findOne({ _id: decodedToken.id_account })
    .then(async (account) => {
      if (!account) {
        return res.status(404).json({
          message: 'Account not found!',
        });
      } else {
        await PersonalInfo.findOne({ id_account: account._id })
          .then(async (personalInfo) => {
            let shareContent = {};
            await Post.findOne({ _id: req.body.shareId })
              .then(async (sharedPost) => {
                await PersonalInfo.findOne(
                  { id_account: sharedPost.id_account },
                  { _id: 0, id_account: 1, avatar: 1, fullName: 1 },
                )
                  .then(async (sharedPersonalInfo) => {
                    shareContent = await {
                      shared_id_account: sharedPersonalInfo.id_account,
                      shared_id_visualMedia: sharedPost.id_visualMedia,
                      shared_postContent: sharedPost.postContent,
                      shared_postFeeling: sharedPost.postFeeling,
                      shared_postPrivacy: sharedPost.postPrivacy,
                      shared_createdAt: sharedPost.createdAt,
                      shared_id_friendTag: sharedPost.id_friendTag,
                      shared_location: sharedPost.location,
                    };
                  })
                  .catch((err) => {
                    res.status(500).json({
                      error: err,
                    });
                  });
              })
              .catch((err) => {
                res.status(500).json({
                  error: err,
                });
              });
            const post = await new Post({
              id_account: account._id,
              avatar: personalInfo.avatar,
              fullName: personalInfo.fullName,
              isShared: true,
              shareId: req.body.shareId,
              shareContent,
              ...req.body,
            });
            await post.save().then((result) => {
              res.status(201).json({
                message: 'shared post created!',
                post: result,
              });
            });
          })
          .catch((err) => {
            res.status(500).json({
              error: err,
            });
          });
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [PATCH] /posts/update_post
exports.posts_update_post = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await Account.findOne({ _id: decodedToken.id_account })
    .then(async (account) => {
      await Post.findOneAndUpdate(
        {
          id_account: account._id,
          _id: req.body.id_post,
        },
        req.body,
      )
        .then((result) => {
          if (!result) {
            return res.status(404).json({
              message: 'Post not found!',
            });
          } else {
            res.status(200).json({
              message: 'post updated',
              post: result,
            });
          }
        })
        .catch((err) => {
          res.status(500).json({
            error: err,
          });
        });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [DELETE] /posts/:id/delete_post
exports.posts_delete_post = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await Account.findOne({ _id: decodedToken.id_account })
    .then(async (account) => {
      await Post.findOneAndRemove({
        id_account: account._id,
        _id: req.params.id,
      })
        .then(async (result) => {
          if (!result) {
            return res.status(404).json({
              message: 'Post not found!',
            });
          } else {
            await React.find({ id_post: result._id })
              .then(async (reactions) => {
                for ([index, value] of reactions.entries()) {
                  await React.findOneAndRemove({ _id: value._id }).catch((err) => {
                    res.status(500).json({
                      error: err,
                    });
                  });
                }
              })
              .catch((err) => {
                res.status(500).json({
                  error: err,
                });
              });
            await Comment.find({ id_post: result._id })
              .then(async (comments) => {
                for ([index, value] of comments.entries()) {
                  await Comment.findOneAndRemove({ _id: value._id }).catch((err) => {
                    res.status(500).json({
                      error: err,
                    });
                  });
                }
              })
              .catch((err) => {
                res.status(500).json({
                  error: err,
                });
              });
            await VisualMedia.find({ id_post: result._id })
              .then(async (visualMedias) => {
                for ([index, value] of visualMedias.entries()) {
                  try {
                    await cloudinary.uploader.destroy(value.url.visualUrl, { upload_preset: 'dev_setups' });
                  } catch (error) {
                    res.status(500).json({
                      error,
                    });
                  }
                  await VisualMedia.findOneAndRemove({ _id: value._id }).catch((err) => {
                    res.status(500).json({
                      error: err,
                    });
                  });
                }
              })
              .catch((err) => {
                res.status(500).json({
                  error: err,
                });
              });
            await res.status(200).json({
              message: 'post removed',
              post: result,
            });
          }
        })
        .catch((err) => {
          res.status(500).json({
            error: err,
          });
        });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [GET] /posts/get_all_post
exports.posts_get_all_post = async (req, res, next) => {
  // const authHeader = req.header('Authorization');
  // const token = authHeader && authHeader.split(' ')[1];

  // if (!token) return res.sendStatus(401);

  // var decodedToken = jwt_decode(token);
  await Post.find()
    .sort({ createdAt: -1 })
    .then(async (posts) => {
      let listPost = [];
      for ([index, value] of await posts.entries()) {
        let postInfo = {};
        await PersonalInfo.findOne({ id_account: value.id_account }, { _id: 0, avatar: 1, fullName: 1 })
          .then(async (personalInfo) => {
            await React.find({ id_post: value._id }, { id_account: 1, reactType: 1 })
              .then(async (listReaction) => {
                await Comment.find({ id_post: value._id })
                  .then(async (comments) => {
                    let shareContent = {};
                    if (value.isShared) {
                      const sharedPersonalInfo = await PersonalInfo.findOne(
                        { id_account: value.shareContent.shared_id_account },
                        { _id: 0, avatar: 1, fullName: 1 },
                      );
                      shareContent = {
                        shared_id_account: value.shareContent.shared_id_account,
                        shared_avatar: sharedPersonalInfo.avatar,
                        shared_fullName: sharedPersonalInfo.fullName,
                        shared_id_visualMedia: value.shareContent.shared_id_visualMedia,
                        shared_postContent: value.shareContent.shared_postContent,
                        shared_postFeeling: value.shareContent.shared_postFeeling,
                        shared_postPrivacy: value.shareContent.shared_postPrivacy,
                        shared_createdAt: value.shareContent.shared_createdAt,
                        shared_id_friendTag: value.shareContent.shared_id_friendTag,
                        shared_location: value.shareContent.shared_location,
                      };
                    }
                    postInfo = {
                      id_account: value.id_account,
                      avatar: personalInfo.avatar,
                      fullName: personalInfo.fullName,
                      id_visualMedia: value.id_visualMedia,
                      postContent: value.postContent,
                      postFeeling: value.postFeeling,
                      postPrivacy: value.postPrivacy,
                      id_friendTag: value.id_friendTag,
                      location: value.location,
                      isShared: value.isShared,
                      shareId: value.shareId,
                      shareContent,
                      createdAt: value.createdAt,
                      listReaction,
                      commentAmount: comments.length,
                    };
                  })
                  .catch((err) => {
                    res.status(500).json({
                      error: err,
                    });
                  });
              })
              .catch((err) => {
                res.status(500).json({
                  error: err,
                });
              });
          })
          .catch((err) => {
            res.status(500).json({
              error: err,
            });
          });
        listPost.push(postInfo);
      }
      await res.status(200).json({
        message: 'get all posts successfully',
        listPost,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [GET] /:id/posts/get_all_reaction
exports.posts_get_all_reaction = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await React.find({ id_post: req.params.id }, { id_account: 1, reactType: 1 })
    .then(async (listReaction) => {
      let list = [];
      for ([index, value] of listReaction.entries()) {
        let mutualFriends = [];
        await OtherInfo.findOne({ id_account: value.id_account }, { listFriend: 1 })
          .then(async (otherInfo) => {
            await OtherInfo.findOne({ id_account: decodedToken.id_account }, { listFriend: 1 }).then(async (result) => {
              mutualFriends = await result.listFriend.filter((value1) => {
                for (value2 of otherInfo.listFriend) {
                  return value1 == value2;
                }
              });
            });
          })
          .catch((err) => {
            res.status(500).json({
              error: err,
            });
          });
        await PersonalInfo.findOne(
          { id_account: value.id_account },
          { id_account: 1, avatar: 1, fullName: 1, reactType: value.reactType },
        ).then(async (personal_info) => {
          if (value.id_account != req.body.id_account) {
            const a = personal_info;
            personal_info = {
              reaction: a,
              mutualFriends: mutualFriends.length,
            };
          }
          list.push(personal_info);
        });
      }
      res.status(200).json({
        message: 'get all reactions successfully',
        listReaction: list,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [GET] /:id/posts/get_all_comment
exports.posts_get_all_comment = async (req, res, next) => {
  await Comment.find({ id_post: req.params.id })
    .then(async (listComment) => {
      let list = [];
      for ([index, value] of listComment.entries()) {
        await PersonalInfo.findOne(
          { id_account: value.id_account },
          { id_account: 1, fullName: 1, avatar: 1, commentContent: value.commentContent },
        ).then(async (result) => {
          await React.find({ id_comment: value._id }, { _id: 1, id_account: 1, reactType: 1 })
            .then(async (listReaction) => {
              result = {
                comment: result,
                listReaction,
              };
            })
            .catch((err) => {
              res.status(500).json({
                error: err,
              });
            });
          list.push(result);
        });
      }
      res.status(200).json({
        message: 'get all comments successfully',
        listComment: list,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [GET] /:id/posts/get_all_tagged_friend
exports.posts_get_all_tagged_friend = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await Post.findOne({ _id: req.params.id }, { id_friendTag: 1 })
    .then(async (post) => {
      let listTaggedFriend = [];
      for ([index, value] of post.id_friendTag.entries()) {
        let mutualFriends = [];
        await PersonalInfo.findOne({ id_account: value }, { id_account: 1, avatar: 1, fullName: 1 })
          .then(async (personalInfo) => {
            let a = {};
            if (value == decodedToken.id_account) {
              a = { personalInfo };
            } else {
              await OtherInfo.findOne({ id_account: value }, { listFriend: 1 })
                .then(async (otherInfo) => {
                  await OtherInfo.findOne({ id_account: decodedToken.id_account }, { listFriend: 1 })
                    .then(async (result) => {
                      mutualFriends = await result.listFriend.filter((value1) => otherInfo.listFriend.includes(value1));
                    })
                    .catch((err) => {
                      res.status(500).json({
                        error: err,
                      });
                    });
                })
                .catch((err) => {
                  res.status(500).json({
                    error: err,
                  });
                });
              a = {
                personalInfo,
                mutualFriends: mutualFriends.length,
              };
            }
            listTaggedFriend.push(a);
          })
          .catch((err) => {
            res.status(500).json({
              error: err,
            });
          });
      }
      res.status(200).json({
        message: 'get all tagged friends successfully',
        listTaggedFriend,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};
