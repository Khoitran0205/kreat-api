const Post = require('../models/post/post');
const Account = require('../models/user/account');
const PersonalInfo = require('../models/user/personal_info');
const OtherInfo = require('../models/user/other_info');
const React = require('../models/post/react');
const Comment = require('../models/post/comment');
const VisualMedia = require('../models/post/visual_media');
const Notification = require('../models/notification');

const { cloudinary } = require('../../utils/cloudinary');

const jwt_decode = require('jwt-decode');

// [POST] /posts/create_post
exports.posts_create_post = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    let id_visualMedia = [];
    if (req.body.visualData) {
      const fileStr = req.body.visualData;
      const promises = fileStr.map(async (url) => {
        if (url.type == 'image') {
          let uploadedResponse = await cloudinary.uploader.upload(url.data, {
            resource_type: 'image',
            upload_preset: 'dev_setups',
          });
          id_visualMedia.push({
            type: 'image',
            url: uploadedResponse.public_id,
          });
        } else if (url.type == 'video') {
          let uploadedResponse = await cloudinary.uploader.upload(url.data, {
            resource_type: 'video',
            upload_preset: 'dev_setups',
          });
          id_visualMedia.push({
            type: 'video',
            url: uploadedResponse.public_id,
          });
        }
      });

      await Promise.all(promises);
    }

    const post = new Post({
      id_account: decodedToken.id_account,
      id_visualMedia,
      ...req.body,
    });
    const result = await post.save();
    if (result.id_visualMedia) {
      const visualMediaArray = result.id_visualMedia.map((value) => ({
        id_post: result._id,
        id_account: decodedToken.id_account,
        url: {
          visualType: value.type,
          visualUrl: value.url,
        },
      }));
      await VisualMedia.insertMany(visualMediaArray);
    }
    if (result.id_friendTag.length !== 0) {
      const personalInfo = await PersonalInfo.findOne({ id_account: decodedToken.id_account }, { _id: 0, fullName: 1 });
      for (const [index, value] of result.id_friendTag.entries()) {
        const newNotification = new Notification({
          id_senders: [decodedToken.id_account],
          id_receiver: value,
          id_post: result._id,
          id_comment: null,
          notificationType: 'tag',
          notificationContent: `${personalInfo.fullName} tagged you in a post`,
          notificationTime: new Date(),
          isViewed: false,
        });
        await newNotification.save();
      }
      return res.status(201).json({
        message: 'post created!',
        post: result,
        id_notification_receivers: result.id_friendTag,
      });
    }
    return res.status(201).json({
      message: 'post created!',
      post: result,
    });
  } catch (error) {
    return res.status(500).json({
      error,
    });
  }
};

// [POST] /posts/share_post
exports.posts_share_post = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const personalInfo = await PersonalInfo.findOne({ id_account: decodedToken.id_account });

    const sharedPost = await Post.findOne({ _id: req.body.shareId });
    if (!sharedPost) {
      return res.status(404).json({
        message: 'Shared post not found!',
      });
    }

    const sharedPersonalInfo = await PersonalInfo.findOne(
      { id_account: sharedPost.id_account },
      { _id: 0, id_account: 1, avatar: 1, fullName: 1 },
    );

    const shareContent = {
      shared_id_account: sharedPersonalInfo.id_account,
      shared_id_visualMedia: sharedPost.id_visualMedia,
      shared_postContent: sharedPost.postContent,
      shared_postFeeling: sharedPost.postFeeling,
      shared_postPrivacy: sharedPost.postPrivacy,
      shared_createdAt: sharedPost.createdAt,
      shared_id_friendTag: sharedPost.id_friendTag,
      shared_location: sharedPost.location,
    };

    const post = new Post({
      id_account: decodedToken.id_account,
      avatar: personalInfo.avatar,
      fullName: personalInfo.fullName,
      isShared: true,
      shareId: req.body.shareId,
      shareContent,
      ...req.body,
    });

    const result = await post.save();

    const notification = await Notification.find({
      $and: [{ id_post: req.body.shareId }, { notificationType: 'share' }],
    });
    if (notification.length >= 1) {
      const shareAmmount = await notification[0].id_senders.length;
      let updateNotification = {};
      if (notification[0].id_senders.includes(decodedToken.id_account)) {
        const checkOtherShare = await notification[0].id_senders.filter(
          (account) => account != decodedToken.id_account,
        );
        if (checkOtherShare.length == 0) {
          updateNotification = {
            notificationTime: new Date(),
            isViewed: false,
          };
        } else {
          updateNotification = {
            id_senders: notification[0].id_senders,
            id_receiver: notification[0].id_receiver,
            id_post: notification[0].id_post,
            id_comment: notification[0].id_comment,
            notificationType: notification[0].notificationType,
            notificationContent:
              shareAmmount == 2
                ? `${personalInfo.fullName} and ${shareAmmount - 1} other person shared your post.`
                : `${personalInfo.fullName} and ${shareAmmount - 1} other people shared your post.`,
            isViewed: false,
          };
        }
      } else {
        updateNotification = {
          id_senders: [...notification[0].id_senders, decodedToken.id_account],
          id_receiver: notification[0].id_receiver,
          id_post: notification[0].id_post,
          id_comment: notification[0].id_comment,
          notificationType: notification[0].notificationType,
          notificationContent:
            accountCommentAmount == 1
              ? `${personalInfo.fullName} and ${shareAmmount} other person shared your post.`
              : `${personalInfo.fullName} and ${shareAmmount} other people shared your post.`,
          isViewed: false,
        };
      }

      await Notification.findOneAndUpdate(
        { $and: [{ id_post: req.body.shareId }, { notificationType: 'share' }] },
        updateNotification,
      );
    } else {
      const newNotification = await new Notification({
        id_senders: [decodedToken.id_account],
        id_receiver: sharedPost.id_account,
        id_post: req.body.shareId,
        id_comment: null,
        notificationType: 'share',
        notificationContent: `${personalInfo.fullName} shared your post.`,
        isViewed: false,
      });
      await newNotification.save();
    }

    res.status(201).json({
      message: 'shared post created!',
      id_notification_receivers: [sharedPost.id_account],
      post: result,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [PATCH] /posts/update_post
exports.posts_update_post = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    const account = await Account.findOne({ _id: decodedToken.id_account });
    const result = await Post.findOneAndUpdate(
      {
        id_account: account._id,
        _id: req.body._id,
      },
      req.body,
    );

    if (!result) {
      return res.status(404).json({
        message: 'Post not found!',
      });
    }

    res.status(200).json({
      message: 'post updated',
      post: result,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [DELETE] /posts/:id/delete_post
exports.posts_delete_post = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
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

// [GET] /posts/get_all_post/:page
exports.posts_get_all_post = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const myListFriend = await OtherInfo.findOne({ id_account: decodedToken.id_account }, { _id: 0, listFriend: 1 });
    const posts = await Post.find({
      $or: [
        { postPrivacy: 'public' },
        {
          $and: [
            { postPrivacy: 'friend' },
            { $or: [{ id_account: { $in: myListFriend.listFriend } }, { id_account: decodedToken.id_account }] },
          ],
        },
        { $and: [{ postPrivacy: 'private' }, { id_account: decodedToken.id_account }] },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .skip(10 * req.params.page);

    let listPost = [];
    for (const [index, value] of posts.entries()) {
      let postInfo = {};
      const personalInfo = await PersonalInfo.findOne(
        { id_account: value.id_account },
        { _id: 0, avatar: 1, fullName: 1 },
      );
      const listReaction = await React.find({ id_post: value._id, id_comment: null }, { id_account: 1, reactType: 1 });
      const comments = await Comment.find({ id_post: value._id });

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
        _id: value._id,
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

      listPost.push(postInfo);
    }
    res.status(200).json({
      message: 'get all posts successfully',
      listPost,
    });
  } catch (err) {
    res.status(500).json({
      error: err,
    });
  }
};

// [GET] /posts/:id
exports.posts_get_post_by_id = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const post = await Post.findOne({ _id: req.params.id });

    const personalInfo = await PersonalInfo.findOne(
      { id_account: post.id_account },
      { _id: 0, avatar: 1, fullName: 1 },
    );
    const listReaction = await React.find({ id_post: post._id, id_comment: null }, { id_account: 1, reactType: 1 });
    const comments = await Comment.find({ id_post: post._id });

    let shareContent = {};
    if (post.isShared) {
      const sharedPersonalInfo = await PersonalInfo.findOne(
        { id_account: post.shareContent.shared_id_account },
        { _id: 0, avatar: 1, fullName: 1 },
      );

      shareContent = {
        shared_id_account: post.shareContent.shared_id_account,
        shared_avatar: sharedPersonalInfo.avatar,
        shared_fullName: sharedPersonalInfo.fullName,
        shared_id_visualMedia: post.shareContent.shared_id_visualMedia,
        shared_postContent: post.shareContent.shared_postContent,
        shared_postFeeling: post.shareContent.shared_postFeeling,
        shared_postPrivacy: post.shareContent.shared_postPrivacy,
        shared_createdAt: post.shareContent.shared_createdAt,
        shared_id_friendTag: post.shareContent.shared_id_friendTag,
        shared_location: post.shareContent.shared_location,
      };
    }

    let postInfo = {
      _id: post._id,
      id_account: post.id_account,
      avatar: personalInfo.avatar,
      fullName: personalInfo.fullName,
      id_visualMedia: post.id_visualMedia,
      postContent: post.postContent,
      postFeeling: post.postFeeling,
      postPrivacy: post.postPrivacy,
      id_friendTag: post.id_friendTag,
      location: post.location,
      isShared: post.isShared,
      shareId: post.shareId,
      shareContent,
      createdAt: post.createdAt,
      listReaction,
      commentAmount: comments.length,
    };
    res.status(200).json({
      message: 'get post by id successfully',
      postInfo,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [GET] /posts/:id/get_all_reaction
exports.posts_get_all_reaction = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const myListFriend = await OtherInfo.findOne({ id_account: decodedToken.id_account }, { _id: 0, listFriend: 1 });
    const reactions = await React.find({ $or: [{ id_post: req.params.id }, { id_comment: req.params.id }] }).sort({
      createdAt: -1,
    });
    let listReaction = [];
    for (const [index, react] of reactions.entries()) {
      let mutualFriends = [];
      const personalInfo = await PersonalInfo.findOne(
        { id_account: react.id_account },
        { _id: 0, avatar: 1, fullName: 1 },
      );
      const otherListFriend = await OtherInfo.findOne({ id_account: react.id_account }, { _id: 0, listFriend: 1 });
      mutualFriends = await myListFriend.listFriend.filter((friend) => otherListFriend.listFriend.includes(friend));
      let reactionInfo = {
        id_account: react.id_account,
        avatar: personalInfo.avatar,
        fullName: personalInfo.fullName,
        reactType: react.reactType,
        mutualFriends: mutualFriends.length,
      };
      listReaction.push(reactionInfo);
    }
    res.status(200).json({
      message: 'get all reactions successfully',
      listReaction,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [GET] /posts/:id/get_all_comment
exports.posts_get_all_comment = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const comments = await Comment.find({ id_post: req.params.id }).sort({ createdAt: -1 });
    let listComment = [];
    for (const [index, value] of comments.entries()) {
      let commentInfo = {};
      const personalInfo = await PersonalInfo.findOne(
        { id_account: value.id_account },
        { _id: 0, avatar: 1, fullName: 1 },
      );
      const listReaction = await React.find({ id_comment: value._id }, { id_account: 1, reactType: 1 });
      commentInfo = {
        _id: value._id,
        avatar: personalInfo.avatar,
        fullName: personalInfo.fullName,
        commentContent: value.commentContent,
        commentImage: value.commentImage,
        createdAt: value.createdAt,
        listReaction,
      };
      listComment.push(commentInfo);
    }
    res.status(200).json({
      message: 'get all comments successfully',
      listComment,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [GET] /posts/:id/get_all_tagged_friend
exports.posts_get_all_tagged_friend = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
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

// [GET] /posts/get_all_friend_to_tag
exports.posts_get_all_friend_to_tag = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const myListFriend = await OtherInfo.findOne({ id_account: decodedToken.id_account }, { _id: 0, listFriend: 1 });
    let listFriend = [];

    for (const [index, friend] of myListFriend.listFriend.entries()) {
      let friendInfo = {};
      const personalInfo = await PersonalInfo.findOne({ id_account: friend }, { _id: 0, avatar: 1, fullName: 1 });
      friendInfo = {
        id_account: friend,
        avatar: personalInfo.avatar,
        fullName: personalInfo.fullName,
      };
      listFriend.push(friendInfo);
    }
    res.status(200).json({
      message: 'get all friends to tag successfully',
      listFriend,
    });
  } catch (error) {
    res.status(500).json(error);
  }
};
