const Account = require('../models/user/account');
const PersonalInfo = require('../models/user/personal_info');
const FavoriteInfo = require('../models/user/favorite_info');
const EducationInfo = require('../models/user/education_info');
const OtherInfo = require('../models/user/other_info');
const React = require('../models/post/react');
const Comment = require('../models/post/comment');
const ToxicDetection = require('../models/post/toxic_detection');
const Post = require('../models/post/post');
const FriendRequest = require('../models/request/friend_request');
const VisualMedia = require('../models/post/visual_media');
const Conversation = require('../models/chat/conversation');
const Message = require('../models/chat/message');
const Notification = require('../models/notification');
const Setting = require('../models/user/setting');
const bcrypt = require('bcrypt');

const { cloudinary } = require('../../utils/cloudinary');

const jwt_decode = require('jwt-decode');
const randomNumber = require('../../utils/generating_code');
const nodemailer = require('../../utils/nodemailer');

const axios = require('axios');
const schedule = require('node-schedule');
const { add } = require('date-fns');

const env = require('dotenv');

env.config();

// [GET] /accounts/:id/timeline
exports.accounts_get_timeline_info = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const myFriends = await OtherInfo.findOne({ id_account: decodedToken.id_account }, { _id: 0, listFriend: 1 });
    let friendStatus = '';
    let id_friendRequest = '';
    const isFriend = myFriends.listFriend.includes(req.params.id);
    if (isFriend) {
      friendStatus = 'friend';
    } else {
      const sentRequest = await FriendRequest.findOne({
        id_sender: decodedToken.id_account,
        id_receiver: req.params.id,
      });
      if (sentRequest) {
        friendStatus = 'friend request sent';
        id_friendRequest = sentRequest._id.toString();
      } else {
        const receivedRequest = await FriendRequest.findOne({
          id_receiver: decodedToken.id_account,
          id_sender: req.params.id,
        });
        if (receivedRequest) {
          friendStatus = 'friend request received';
          id_friendRequest = receivedRequest._id.toString();
        } else {
          friendStatus = 'not friend';
        }
      }
    }
    const personalInfo = await PersonalInfo.findOne(
      { id_account: req.params.id },
      { _id: 0, id_account: 1, avatar: 1, fullName: 1 },
    );
    const posts = await Post.find({
      $or: [
        { $and: [{ postPrivacy: 'public' }, { isActive: true }, { id_account: req.params.id }] },
        {
          $and: [
            { postPrivacy: 'friend' },
            { isActive: true },
            { id_account: req.params.id },
            { $or: [{ id_account: { $in: myFriends.listFriend } }, { id_account: decodedToken.id_account }] },
          ],
        },
        {
          $and: [
            { postPrivacy: 'private' },
            { isActive: true },
            { id_account: decodedToken.id_account },
            { id_account: req.params.id },
          ],
        },
      ],
    }).sort({ createdAt: -1 });
    const listPost = [];

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
      message: 'get timeline info successfully',
      avatar: personalInfo.avatar,
      fullName: personalInfo.fullName,
      friendStatus,
      id_friendRequest,
      timeline: listPost,
    });
  } catch (err) {
    res.status(500).json({
      error: err,
    });
  }
};

// [GET] /accounts/scheduled_posts
exports.accounts_get_scheduled_posts = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const posts = await Post.find({
      $and: [{ isActive: false }, { id_account: decodedToken.id_account }],
    }).sort({ createdAt: 1 });
    const listPost = [];

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
      message: 'get scheduled posts successfully',
      listPost,
    });
  } catch (err) {
    res.status(500).json({
      error: err,
    });
  }
};

// [GET] /accounts/:id/about
exports.accounts_get_about_info = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    const personalInfo = await PersonalInfo.findOne({ id_account: req.params.id });
    const favoriteInfo = await FavoriteInfo.findOne({ id_account: req.params.id });
    const educationInfo = await EducationInfo.findOne({ id_account: req.params.id });

    res.status(200).json({
      message: 'get about info successfully',
      about: {
        personalInfo,
        favoriteInfo,
        educationInfo,
      },
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [GET] /accounts/:id/friends
exports.accounts_get_all_friends = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    const myInfo = await OtherInfo.findOne({ id_account: decodedToken.id_account }, { listFriend: 1 });
    const result = await OtherInfo.findOne({ id_account: req.params.id }, { listFriend: 1 });

    const listFriend = [];
    for (const [index, value] of result.listFriend.entries()) {
      let friendInfo = {};
      let mutualFriends = [];

      const personalInfo = await PersonalInfo.findOne({ id_account: value }, { avatar: 1, fullName: 1, aboutMe: 1 });

      if (value == decodedToken.id_account) {
        friendInfo = {
          id_account: value,
          avatar: personalInfo.avatar,
          fullName: personalInfo.fullName,
          aboutMe: personalInfo.aboutMe,
          friendAmount: myInfo.listFriend.length,
        };
      } else {
        const otherInfo = await OtherInfo.findOne({ id_account: value }, { listFriend: 1 });
        mutualFriends = otherInfo.listFriend.filter((value1) => myInfo.listFriend.includes(value1));

        friendInfo = {
          id_account: value,
          avatar: personalInfo.avatar,
          fullName: personalInfo.fullName,
          aboutMe: personalInfo.aboutMe,
          friendAmount: otherInfo.listFriend.length,
          mutualFriends: mutualFriends.length,
        };
      }

      listFriend.push(friendInfo);
    }

    res.status(200).json({
      message: 'get all friends successfully',
      listFriend,
    });
  } catch (err) {
    res.status(500).json({
      error: err,
    });
  }
};

// [GET] /accounts/:id/visual_media
exports.accounts_get_visual_media_info = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    const listURL = await VisualMedia.find(
      { $and: [{ id_account: req.params.id }, { id_post: { $ne: null } }] },
      { url: 1 },
    ).sort({ createdAt: -1 });

    res.status(200).json({
      message: 'get all images and videos successfully',
      listURL,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [GET] /accounts/:id/avatar
exports.accounts_get_all_avatars = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    const listURL = await VisualMedia.find(
      { $and: [{ id_account: req.params.id }, { id_post: null }] },
      { url: 1 },
    ).sort({ createdAt: -1 });

    res.status(200).json({
      message: 'get all avatars successfully',
      listURL,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [GET] /accounts/tagged-in_post
exports.accounts_get_tagged_in_posts = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    const posts = await Post.find({
      id_friendTag: { $in: [decodedToken.id_account] },
    }).sort({ createdAt: -1 });

    const listPost = [];
    for (const [index, value] of posts.entries()) {
      let postInfo = {};
      const personalInfo = await PersonalInfo.findOne(
        { id_account: value.id_account },
        { _id: 0, avatar: 1, fullName: 1 },
      );
      const listReaction = await React.find({ id_post: value._id, id_comment: null }, { id_account: 1, reactType: 1 });
      const comments = await Comment.find({ id_post: value._id });

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
        shareContent: {},
        createdAt: value.createdAt,
        listReaction,
        commentAmount: comments.length,
      };

      listPost.push(postInfo);
    }
    res.status(200).json({
      message: 'get tagged-in posts successfully',
      listPost,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [PATCH] /accounts/update_personal_info
exports.accounts_update_personal_info = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    await PersonalInfo.findOneAndUpdate({ id_account: decodedToken.id_account }, req.body, { new: true });
    if (req.body.avatarData) {
      const fileStr = req.body.avatarData;
      let uploadedResponse = await cloudinary.uploader.upload(fileStr, {
        resource_type: 'image',
        upload_preset: 'avatar_setups',
      });
      await PersonalInfo.findOneAndUpdate(
        { id_account: decodedToken.id_account },
        { avatar: uploadedResponse.public_id },
      );
      const avatar = await new VisualMedia({
        id_post: null,
        id_account: decodedToken.id_account,
        url: {
          visualType: 'avatar',
          visualUrl: uploadedResponse.public_id,
        },
      });
      await avatar.save();
      res.status(200).json({
        message: 'update successfully',
        url: uploadedResponse.public_id,
      });
    } else {
      res.status(200).json({
        message: 'update successfully',
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [PATCH] /accounts/update_favorite_info
exports.accounts_update_favorite_info = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
  await FavoriteInfo.findOneAndUpdate({ id_account: decodedToken.id_account }, req.body, { new: true })
    .then((result) => {
      res.status(200).json({
        message: 'update successfully',
        result,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [PATCH] /accounts/update_education_info
exports.accounts_update_education_info = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
  await EducationInfo.findOneAndUpdate({ id_account: decodedToken.id_account }, req.body, { new: true })
    .then((result) => {
      res.status(200).json({
        message: 'update successfully',
        result,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [PATCH] /accounts/update_other_info
exports.accounts_update_other_info = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
  await OtherInfo.findOneAndUpdate({ id_account: decodedToken.id_account }, req.body, { new: true })
    .then((result) => {
      res.status(200).json({
        message: 'update successfully',
        result,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [GET] /accounts/search
exports.accounts_search_accounts = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
  const p = req.query.q;
  await PersonalInfo.find({ fullName: new RegExp(p, 'i') }, { _id: 0, id_account: 1, avatar: 1, fullName: 1 })
    .then(async (results) => {
      let searchedAccount = [];
      for ([index, value] of results.entries()) {
        let accountInfo = {};
        let mutualFriends = [];
        if (value.id_account == decodedToken.id_account) {
        } else {
          await OtherInfo.findOne({ id_account: value.id_account }, { _id: 0, listFriend: 1 })
            .then(async (otherInfo) => {
              await OtherInfo.findOne({ id_account: decodedToken.id_account }, { _id: 0, listFriend: 1 })
                .then(async (myFriends) => {
                  mutualFriends = await myFriends.listFriend.filter((value1) => otherInfo.listFriend.includes(value1));
                })
                .catch((err) => {
                  res.status(500).json({
                    error: err,
                  });
                });
              accountInfo = {
                id_account: value.id_account,
                avatar: value.avatar,
                fullName: value.fullName,
                mutualFriends: mutualFriends.length,
              };
            })
            .catch((err) => {
              res.status(500).json({
                error: err,
              });
            });
          searchedAccount.push(accountInfo);
        }
      }
      res.status(200).json({
        accounts: searchedAccount,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [GET] /accounts/:id/friends/search
exports.accounts_search_friends = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
  const p = req.query.q;
  await OtherInfo.findOne({ id_account: req.params.id }, { listFriend: 1 })
    .then(async (result) => {
      let friendInfos = [];
      for ([index, value] of result.listFriend.entries()) {
        await PersonalInfo.findOne({ id_account: value }, { id_account: 1, fullName: 1 })
          .then((info) => {
            friendInfos.push(info);
          })
          .catch((err) => {
            res.status(500).json({
              error: err,
            });
          });
      }
      const searchedFriends = await friendInfos.filter((friend) =>
        friend.fullName.toLowerCase().includes(p.toLowerCase()),
      );
      let listFriend = [];
      for ([index, value] of searchedFriends.entries()) {
        let friendInfo = {};
        let mutualFriends = [];
        await PersonalInfo.findOne({ id_account: value.id_account }, { avatar: 1, aboutMe: 1 })
          .then(async (personalInfo) => {
            await OtherInfo.findOne({ id_account: decodedToken.id_account }, { listFriend: 1 })
              .then(async (myFriends) => {
                if (value.id_account == decodedToken.id_account) {
                  friendInfo = {
                    id_account: value.id_account,
                    avatar: personalInfo.avatar,
                    fullName: value.fullName,
                    aboutMe: personalInfo.aboutMe,
                    friendAmount: myFriends.listFriend.length,
                  };
                } else {
                  await OtherInfo.findOne({ id_account: value.id_account }, { listFriend: 1 })
                    .then(async (otherInfo) => {
                      mutualFriends = await otherInfo.listFriend.filter((value1) =>
                        myFriends.listFriend.includes(value1),
                      );
                      friendInfo = {
                        id_account: value.id_account,
                        avatar: personalInfo.avatar,
                        fullName: value.fullName,
                        aboutMe: personalInfo.aboutMe,
                        friendAmount: otherInfo.listFriend.length,
                        mutualFriends: mutualFriends.length,
                      };
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
          })
          .catch((err) => {
            res.status(500).json({
              error: err,
            });
          });
        listFriend.push(friendInfo);
      }
      res.status(200).json({
        searchAmount: listFriend.length,
        searchedFriends: listFriend,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [GET] /accounts/friend_requests
exports.accounts_get_all_friend_requests = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const senders = await FriendRequest.find({ id_receiver: decodedToken.id_account }, { id_sender: 1 });
    const result = await OtherInfo.findOne({ id_account: decodedToken.id_account }, { listFriend: 1 });

    const listRequest = [];
    for (const [index, value] of senders.entries()) {
      let friendRequestInfo = {};
      let mutualFriends = [];

      const personalInfo = await PersonalInfo.findOne(
        { id_account: value.id_sender },
        { fullName: 1, avatar: 1, aboutMe: 1 },
      );
      const otherInfo = await OtherInfo.findOne({ id_account: value.id_sender }, { listFriend: 1 });

      mutualFriends = otherInfo.listFriend.filter((value1) => {
        for (const value2 of result.listFriend) {
          return value1 == value2;
        }
      });

      friendRequestInfo = {
        id_friendRequest: value._id,
        id_account: value.id_sender,
        avatar: personalInfo.avatar,
        fullName: personalInfo.fullName,
        aboutMe: personalInfo.aboutMe,
        friendAmount: otherInfo.listFriend.length,
        mutualFriends: mutualFriends.length,
      };

      listRequest.push(friendRequestInfo);
    }

    res.status(200).json({
      message: 'get all friend requests successfully',
      listRequest,
    });
  } catch (err) {
    res.status(500).json({
      error: err,
    });
  }
};

// [POST] /accounts/send_friend_request
exports.accounts_send_friend_request = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    const friendRequest = await new FriendRequest({
      id_sender: decodedToken.id_account,
      id_receiver: req.body.id_receiver,
    });
    await friendRequest.save();

    const personalInfo = await PersonalInfo.findOne({ id_account: decodedToken.id_account }, { _id: 0, fullName: 1 });

    const newNotification = await new Notification({
      id_senders: [decodedToken.id_account],
      id_receiver: req.body.id_receiver,
      id_post: null,
      id_comment: null,
      notificationType: 'friend request',
      notificationEnglishContent: `${personalInfo.fullName} sent you a friend request.`,
      notificationVietnameseContent: `${personalInfo.fullName} đã gửi cho bạn một lời mời kết bạn.`,
      notificationTime: new Date(),
      isViewed: false,
    });
    await newNotification.save();

    res.status(201).json({
      message: 'friend request sended successfully',
      id_notification_receivers: [req.body.id_receiver],
      friendRequest,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [DELETE] /accounts/:id/cancel_friend_request
exports.accounts_cancel_friend_request = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const friendRequest = await FriendRequest.findOneAndDelete({
      $and: [{ id_sender: decodedToken.id_account }, { id_receiver: req.params.id }],
    });

    if (!friendRequest) {
      res.sendStatus(401);
    } else {
      await Notification.findOneAndDelete({
        $and: [
          { id_senders: [decodedToken.id_account] },
          { id_receiver: req.params.id },
          { notificationType: 'friend request' },
        ],
      });
    }

    res.status(200).json({
      message: 'friend request canceled',
      friendRequest: friendRequest,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [DELETE] /accounts/:id/accept_friend_request
exports.accounts_accept_friend_request = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const friendRequest = await FriendRequest.findOne({ _id: req.params.id });
    if (friendRequest.id_receiver != decodedToken.id_account) {
      res.sendStatus(401);
    } else {
      const infoSender = await OtherInfo.findOne({ id_account: friendRequest.id_sender });
      const updatedListFriend1 = [...infoSender.listFriend, friendRequest.id_receiver.toString()];
      infoSender.listFriend = updatedListFriend1;
      await infoSender.save();

      const infoReceiver = await OtherInfo.findOne({ id_account: friendRequest.id_receiver });
      const updatedListFriend2 = [...infoReceiver.listFriend, friendRequest.id_sender.toString()];
      infoReceiver.listFriend = updatedListFriend2;
      await infoReceiver.save();

      const conversation = await Conversation.findOne({
        members: { $all: [friendRequest.id_sender.toString(), friendRequest.id_receiver.toString()] },
      });
      if (conversation) {
        conversation.status = true;
        await conversation.save();
      } else {
        const newConversation = await Conversation({
          members: [friendRequest.id_sender.toString(), friendRequest.id_receiver.toString()],
          status: true,
        });
        await newConversation.save();
      }

      await FriendRequest.findOneAndDelete({ _id: req.params.id });

      const personalInfo = await PersonalInfo.findOne({ id_account: decodedToken.id_account }, { _id: 0, fullName: 1 });
      const personalInfo2 = await PersonalInfo.findOne(
        { id_account: friendRequest.id_sender },
        { _id: 0, fullName: 1 },
      );

      await Notification.findOneAndUpdate(
        {
          $and: [
            { id_senders: [friendRequest.id_sender.toString()] },
            { id_receiver: decodedToken.id_account },
            { notificationType: 'friend request' },
          ],
        },
        {
          notificationEnglishContent: `You and ${personalInfo2.fullName} are friends now.`,
          notificationVietnameseContent: `Bạn và ${personalInfo2.fullName} đã trở thành bạn bè của nhau.`,
          notificationTime: new Date(),
          isViewed: false,
        },
      );

      const newNotification = await new Notification({
        id_senders: [decodedToken.id_account],
        id_receiver: friendRequest.id_sender,
        id_post: null,
        id_comment: null,
        notificationType: 'friend request',
        notificationEnglishContent: `${personalInfo.fullName} accepted your friend request.`,
        notificationVietnameseContent: `${personalInfo.fullName} đã chấp nhận lời mời kết bạn của bạn.`,
        notificationTime: new Date(),
        isViewed: false,
      });
      await newNotification.save();

      res.status(200).json({
        message: 'friend request accepted',
        id_notification_receivers: [decodedToken.id_account, friendRequest.id_sender.toString()],
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [DELETE] /accounts/:id/decline_friend_request
exports.accounts_decline_friend_request = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);

  await FriendRequest.findOne({ _id: req.params.id })
    .then(async (friendRequest) => {
      if (decodedToken.id_account != friendRequest.id_receiver) {
        res.sendStatus(401);
      } else {
        await FriendRequest.findOneAndDelete({ _id: req.params.id })
          .then((result) => {
            res.status(200).json({
              message: 'friend request deleted',
              friendRequest: result,
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

// [DELETE] /accounts/:id/unfriend
exports.accounts_unfriend = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const myListFriend = await OtherInfo.findOne({ id_account: decodedToken.id_account }, { _id: 0, listFriend: 1 });
    const friendRemovedList1 = await myListFriend.listFriend.filter((friend) => friend != req.params.id);
    await OtherInfo.findOneAndUpdate({ id_account: decodedToken.id_account }, { listFriend: friendRemovedList1 });

    const otherListFriend = await OtherInfo.findOne({ id_account: req.params.id }, { _id: 0, listFriend: 1 });
    const friendRemovedList2 = await otherListFriend.listFriend.filter((friend) => friend != decodedToken.id_account);
    await OtherInfo.findOneAndUpdate({ id_account: req.params.id }, { listFriend: friendRemovedList2 });
    await Conversation.findOneAndUpdate(
      { members: { $all: [decodedToken.id_account, req.params.id] } },
      { status: false },
    );
    res.status(200).json({
      message: 'unfriend successfully',
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [POST] /accounts/react
exports.accounts_react = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const personalInfo = await PersonalInfo.findOne(
      { id_account: decodedToken.id_account },
      { _id: 0, avatar: 1, fullName: 1 },
    );

    const react = new React({
      id_account: decodedToken.id_account,
      ...req.body,
    });

    const post = await Post.findOne({ _id: req.body.id_post });
    if (!post) {
      const comment = await Comment.findOne({ _id: req.body.id_comment });
      if (!comment) {
        return res.status(404).json({ message: 'post or comment not found' });
      }
      const result = await react.save();
      const notification = await Notification.find({
        $and: [
          { id_comment: result.id_comment },
          {
            $or: [
              { notificationType: 'like' },
              { notificationType: 'love' },
              { notificationType: 'haha' },
              { notificationType: 'wow' },
              { notificationType: 'sad' },
              { notificationType: 'angry' },
            ],
          },
        ],
      });
      if (notification.length >= 1) {
        const reactAmount = await notification[0].id_senders.length;
        const updateNotification = {
          id_senders: [...notification[0].id_senders, decodedToken.id_account],
          id_receiver: notification[0].id_receiver,
          id_post: notification[0].id_post,
          id_comment: notification[0].id_comment,
          notificationType: req.body.reactType,
          notificationEnglishContent:
            reactAmount == 1
              ? `${personalInfo.fullName} and ${reactAmount} other person reacted to your comment.`
              : `${personalInfo.fullName} and ${reactAmount} other people reacted to your comment.`,
          notificationVietnameseContent: `${personalInfo.fullName} và ${reactAmount} người khác đã bày tỏ cảm xúc về một bình luận của bạn.`,
          notificationTime: new Date(),
          isViewed: false,
        };
        await Notification.findOneAndUpdate(
          {
            $and: [
              { id_comment: result.id_comment },
              {
                $or: [
                  { notificationType: 'like' },
                  { notificationType: 'love' },
                  { notificationType: 'haha' },
                  { notificationType: 'wow' },
                  { notificationType: 'sad' },
                  { notificationType: 'angry' },
                ],
              },
            ],
          },
          updateNotification,
        );
      } else {
        const newNotification = await new Notification({
          id_senders: [decodedToken.id_account],
          id_receiver: comment.id_account,
          id_post: comment.id_post,
          id_comment: result.id_comment,
          notificationType: req.body.reactType,
          notificationEnglishContent: `${personalInfo.fullName} reacted to your comment.`,
          notificationVietnameseContent: `${personalInfo.fullName} đã bày tỏ cảm xúc về một bình luận của bạn.`,
          notificationTime: new Date(),
          isViewed: false,
        });
        await newNotification.save();
      }
      return res.status(201).json({
        message: 'reaction on comment stored',
        id_notification_receivers: [comment.id_account],
        reaction: result,
      });
    }

    const result = await react.save();
    const notification = await Notification.find({
      $and: [
        { id_post: result.id_post },
        {
          $or: [
            { notificationType: 'like' },
            { notificationType: 'love' },
            { notificationType: 'haha' },
            { notificationType: 'wow' },
            { notificationType: 'sad' },
            { notificationType: 'angry' },
          ],
        },
      ],
    });
    if (notification.length >= 1) {
      const reactAmount = await notification[0].id_senders.length;
      const updateNotification = {
        id_senders: [...notification[0].id_senders, decodedToken.id_account],
        id_receiver: notification[0].id_receiver,
        id_post: notification[0].id_post,
        id_comment: notification[0].id_comment,
        notificationType: req.body.reactType,
        notificationEnglishContent:
          reactAmount == 1
            ? `${personalInfo.fullName} and ${reactAmount} other person reacted to your post.`
            : `${personalInfo.fullName} and ${reactAmount} other people reacted to your post.`,
        notificationVietnameseContent: `${personalInfo.fullName} và ${reactAmount} người khác đã bày tỏ cảm xúc về một bài viết của bạn.`,
        notificationTime: new Date(),
        isViewed: false,
      };
      await Notification.findOneAndUpdate(
        {
          $and: [
            { id_post: result.id_post },
            {
              $or: [
                { notificationType: 'like' },
                { notificationType: 'love' },
                { notificationType: 'haha' },
                { notificationType: 'wow' },
                { notificationType: 'sad' },
                { notificationType: 'angry' },
              ],
            },
          ],
        },
        updateNotification,
      );
    } else {
      const newNotification = await new Notification({
        id_senders: [decodedToken.id_account],
        id_receiver: post.id_account,
        id_post: result.id_post,
        id_comment: null,
        notificationType: req.body.reactType,
        notificationEnglishContent: `${personalInfo.fullName} reacted to your post.`,
        notificationVietnameseContent: `${personalInfo.fullName} đã bày tỏ cảm xúc về một bài viết của bạn.`,
        notificationTime: new Date(),
        isViewed: false,
      });
      await newNotification.save();
    }
    res.status(201).json({
      message: 'reaction on post stored',
      id_notification_receivers: [post.id_account],
      reaction: result,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error,
    });
  }
};

// [PATCH] /accounts/update_react
exports.accounts_update_react = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
  await React.findOneAndUpdate(
    {
      id_post: req.body.id_post,
      id_comment: req.body.id_comment,
      id_account: decodedToken.id_account,
    },
    {
      reactType: req.body.reactType,
    },
    {
      new: true,
    },
  )
    .then((result) => {
      if (!result) res.sendStatus(401);
      else {
        res.status(200).json({
          message: 'reaction updated',
          reaction: result,
        });
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [DELETE] /accounts/:id/unreact_post
exports.accounts_unreact_post = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const result = await React.findOneAndRemove({
      id_post: req.params.id,
      id_account: decodedToken.id_account,
    });

    if (!result) {
      res.sendStatus(401);
    } else {
      const notification = await Notification.findOne({
        $and: [
          { id_post: req.params.id },
          {
            $or: [
              { notificationType: 'like' },
              { notificationType: 'love' },
              { notificationType: 'haha' },
              { notificationType: 'wow' },
              { notificationType: 'sad' },
              { notificationType: 'angry' },
            ],
          },
        ],
      });
      const removeSenderList = await notification?.id_senders?.filter((sender) => sender != decodedToken.id_account);
      if (removeSenderList.length == 0) {
        await Notification.findOneAndDelete({
          $and: [
            { id_post: req.params.id },
            {
              $or: [
                { notificationType: 'like' },
                { notificationType: 'love' },
                { notificationType: 'haha' },
                { notificationType: 'wow' },
                { notificationType: 'sad' },
                { notificationType: 'angry' },
              ],
            },
          ],
        });
      } else {
        await Notification.findOneAndUpdate(
          {
            $and: [
              { id_post: req.params.id },
              {
                $or: [
                  { notificationType: 'like' },
                  { notificationType: 'love' },
                  { notificationType: 'haha' },
                  { notificationType: 'wow' },
                  { notificationType: 'sad' },
                  { notificationType: 'angry' },
                ],
              },
            ],
          },
          { id_senders: removeSenderList },
        );
      }

      res.status(200).json({
        message: 'reaction on post removed',
        reaction: result,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [DELETE] /accounts/:id/unreact_comment
exports.accounts_unreact_comment = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const result = await React.findOneAndRemove({
      id_comment: req.params.id,
      id_account: decodedToken.id_account,
    });

    if (!result) {
      res.sendStatus(401);
    } else {
      const notification = await Notification.findOne({
        $and: [
          { id_comment: req.params.id },
          {
            $or: [
              { notificationType: 'like' },
              { notificationType: 'love' },
              { notificationType: 'haha' },
              { notificationType: 'wow' },
              { notificationType: 'sad' },
              { notificationType: 'angry' },
            ],
          },
        ],
      });
      const removeSenderList = await notification?.id_senders?.filter((sender) => sender != decodedToken.id_account);
      if (removeSenderList.length == 0) {
        await Notification.findOneAndDelete({
          $and: [
            { id_comment: req.params.id },
            {
              $or: [
                { notificationType: 'like' },
                { notificationType: 'love' },
                { notificationType: 'haha' },
                { notificationType: 'wow' },
                { notificationType: 'sad' },
                { notificationType: 'angry' },
              ],
            },
          ],
        });
      } else {
        await Notification.findOneAndUpdate(
          {
            $and: [
              { id_comment: req.params.id },
              {
                $or: [
                  { notificationType: 'like' },
                  { notificationType: 'love' },
                  { notificationType: 'haha' },
                  { notificationType: 'wow' },
                  { notificationType: 'sad' },
                  { notificationType: 'angry' },
                ],
              },
            ],
          },
          { id_senders: removeSenderList },
        );
      }

      res.status(200).json({
        message: 'reaction on comment removed',
        reaction: result,
      });
    }
  } catch (err) {
    return res.status(500).json({
      error: err,
    });
  }
};

// [POST] /accounts/comment_post
exports.accounts_comment_post = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    const existedAccount = await Account.findOne({ _id: decodedToken.id_account });
    const { isBlocked } = existedAccount;

    if (isBlocked) {
      res.status(406).json({
        message: 'this account is blocked',
      });
    } else {
      const data = await axios.post(process.env.TOXIC_COMMENT_API, {
        comments: req.body.commentContent || '',
      });
      const checkToxic = data?.data?.response;
      if (checkToxic[1] >= 0.5) {
        const toxicDetection = await new ToxicDetection({
          content: req.body.commentContent,
          id_account: decodedToken.id_account,
          type: 'comment',
        });

        await toxicDetection.save();

        const newWarningAmount = existedAccount?.warningAmount + 1;

        switch (newWarningAmount) {
          case 3:
            await Account.findOneAndUpdate(
              { _id: decodedToken.id_account },
              { isBlocked: true, warningAmount: newWarningAmount },
            );

            const block3Notification = await new Notification({
              id_senders: [process.env.ADMIN_ID],
              id_receiver: decodedToken.id_account,
              notificationType: 'block',
              notificationEnglishContent: `Your account has been blocked due to inappropriate language use. You will not be able to post or comment for the next 3 days.`,
              notificationVietnameseContent: `Tài khoản của bạn đã bị khóa do sử dụng ngôn từ không phù hợp. Bạn sẽ không thể đăng bài hoặc bình luận trong 3 ngày tới.`,
              notificationTime: new Date(),
              isViewed: false,
            });
            await block3Notification.save();

            const unblock3Date = add(new Date(), { days: 3 });
            schedule.scheduleJob(unblock3Date, async function () {
              await Account.findOneAndUpdate({ _id: decodedToken.id_account }, { isBlocked: false });
              const unblock3Notification = await new Notification({
                id_senders: [process.env.ADMIN_ID],
                id_receiver: decodedToken.id_account,
                notificationType: 'unblock',
                notificationEnglishContent: `Your account has been unblocked.`,
                notificationVietnameseContent: `Tài khoản của bạn đã được mở khóa.`,
                notificationTime: new Date(unblock3Date),
                isViewed: false,
              });
              await unblock3Notification.save();
            });
            break;
          case 5:
            await Account.findOneAndUpdate(
              { _id: decodedToken.id_account },
              { isBlocked: true, warningAmount: newWarningAmount },
            );

            const block5Notification = await new Notification({
              id_senders: [process.env.ADMIN_ID],
              id_receiver: decodedToken.id_account,
              notificationType: 'block',
              notificationEnglishContent: `Your account has been blocked due to inappropriate language use. You will not be able to post or comment for the next 7 days.`,
              notificationVietnameseContent: `Tài khoản của bạn đã bị khóa do sử dụng ngôn từ không phù hợp. Bạn sẽ không thể đăng bài hoặc bình luận trong 7 ngày tới.`,
              notificationTime: new Date(),
              isViewed: false,
            });
            await block5Notification.save();

            const unblock5Date = add(new Date(), { days: 7 });
            schedule.scheduleJob(unblock5Date, async function () {
              await Account.findOneAndUpdate({ _id: decodedToken.id_account }, { isBlocked: false });
              const unblock5Notification = await new Notification({
                id_senders: [process.env.ADMIN_ID],
                id_receiver: decodedToken.id_account,
                notificationType: 'unblock',
                notificationEnglishContent: `Your account has been unblocked.`,
                notificationVietnameseContent: `Tài khoản của bạn đã được mở khóa.`,
                notificationTime: new Date(unblock5Date),
                isViewed: false,
              });
              await unblock5Notification.save();
            });
            break;
          case 7:
            await Account.findOneAndUpdate(
              { _id: decodedToken.id_account },
              { isBlocked: true, warningAmount: newWarningAmount },
            );

            const block7Notification = await new Notification({
              id_senders: [process.env.ADMIN_ID],
              id_receiver: decodedToken.id_account,
              notificationType: 'block',
              notificationEnglishContent: `Your account has been blocked due to inappropriate language use. You will not be able to post or comment for the next 30 days.`,
              notificationVietnameseContent: `Tài khoản của bạn đã bị khóa do sử dụng ngôn từ không phù hợp. Bạn sẽ không thể đăng bài hoặc bình luận trong 30 ngày tới.`,
              notificationTime: new Date(),
              isViewed: false,
            });
            await block7Notification.save();

            const unblock7Date = add(new Date(), { days: 30 });
            schedule.scheduleJob(unblock7Date, async function () {
              await Account.findOneAndUpdate({ _id: decodedToken.id_account }, { isBlocked: false });
              const unblock7Notification = await new Notification({
                id_senders: [process.env.ADMIN_ID],
                id_receiver: decodedToken.id_account,
                notificationType: 'unblock',
                notificationEnglishContent: `Your account has been unblocked.`,
                notificationVietnameseContent: `Tài khoản của bạn đã được mở khóa.`,
                notificationTime: new Date(unblock7Date),
                isViewed: false,
              });
              await unblock7Notification.save();
            });
            break;
          default:
            await Account.findOneAndUpdate({ _id: decodedToken.id_account }, { warningAmount: newWarningAmount });
            break;
        }
        res.status(400).json({
          message: 'inappropriate language comment',
        });
      } else {
        let uploadedResponse;
        if (req.body.commentImage) {
          const fileStr = req.body.commentImage;
          uploadedResponse = await cloudinary.uploader.upload(fileStr, {
            resource_type: 'image',
            upload_preset: 'comment_setups',
          });

          const commentImg = await new VisualMedia({
            id_post: req.body.id_post,
            id_account: decodedToken.id_account,
            url: {
              visualType: 'comment',
              visualUrl: uploadedResponse?.public_id,
            },
          });
          await commentImg.save();
        }

        const comment = await new Comment({
          ...req.body,
          id_account: decodedToken.id_account,
          commentImage: uploadedResponse?.public_id,
        });

        await comment.save();
        const personalInfo = await PersonalInfo.findOne(
          { id_account: decodedToken.id_account },
          { _id: 0, avatar: 1, fullName: 1 },
        );
        const id_receiver = await Post.findOne({ _id: req.body.id_post }, { id_account: 1 });
        const newComment = {
          _id: comment._id,
          avatar: personalInfo.avatar,
          fullName: personalInfo.fullName,
          commentContent: comment.commentContent,
          commentImage: comment.commentImage,
          listReaction: [],
          createdAt: new Date(),
        };

        const notification = await Notification.find({
          $and: [{ id_post: req.body.id_post }, { notificationType: 'comment' }],
        });
        if (notification.length >= 1) {
          const accountCommentAmount = await notification[0].id_senders.length;
          let updateNotification = {};
          if (notification[0].id_senders.includes(decodedToken.id_account)) {
            const checkOtherComment = await notification[0].id_senders.filter(
              (account) => account != decodedToken.id_account,
            );
            if (checkOtherComment.length == 0) {
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
                notificationEnglishContent:
                  accountCommentAmount == 2
                    ? `${personalInfo.fullName} and ${accountCommentAmount - 1} other person commented on your post.`
                    : `${personalInfo.fullName} and ${accountCommentAmount - 1} other people commented on your post.`,
                notificationVietnameseContent: `${personalInfo.fullName} và ${
                  accountCommentAmount - 1
                } người khác đã bình luận vào một bài viết của bạn.`,
                notificationTime: new Date(),
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
              notificationEnglishContent:
                accountCommentAmount == 1
                  ? `${personalInfo.fullName} and ${accountCommentAmount} other person commented on your post.`
                  : `${personalInfo.fullName} and ${accountCommentAmount} other people commented on your post.`,
              notificationVietnameseContent: `${personalInfo.fullName} và ${accountCommentAmount} người khác đã bình luận vào một bài viết của bạn.`,
              notificationTime: new Date(),
              isViewed: false,
            };
          }

          await Notification.findOneAndUpdate(
            { $and: [{ id_post: req.body.id_post }, { notificationType: 'comment' }] },
            updateNotification,
          );
        } else {
          const newNotification = await new Notification({
            id_senders: [decodedToken.id_account],
            id_receiver: id_receiver.id_account,
            id_post: req.body.id_post,
            id_comment: null,
            notificationType: 'comment',
            notificationEnglishContent: `${personalInfo.fullName} commented on your post.`,
            notificationVietnameseContent: `${personalInfo.fullName} đã bình luận vào một bài viết của bạn.`,
            notificationTime: new Date(),
            isViewed: false,
          });
          await newNotification.save();
        }

        res.status(201).json({
          message: 'comment on post successfully',
          id_notification_receivers: [id_receiver.id_account],
          newComment,
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
};

// [POST] /accounts/reply_comment_post
exports.accounts_reply_comment_post = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const comment = await new Comment({
      id_account: decodedToken.id_account,
      isReply: true,
      id_repliedComment: req.body.id_repliedComment,
      ...req.body,
    });
    await comment.save().then((result) => {
      res.status(201).json({
        message: 'reply comment successfully',
        result,
      });
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [PATCH] /accounts/update_comment_post
exports.accounts_update_comment_post = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    const existedComment = await Comment.findOne({
      _id: req.body._id,
      id_account: decodedToken.id_account,
    });
    if (!existedComment) {
      res.status(400).json({
        error: 'Comment not existed',
      });
    } else {
      const existedAccount = await Account.findOne({ _id: decodedToken.id_account });
      const { isBlocked } = existedAccount;

      if (isBlocked) {
        res.status(406).json({
          message: 'this account is blocked',
        });
      } else {
        const data = await axios.post(process.env.TOXIC_COMMENT_API, {
          comments: req.body.commentContent || '',
        });
        const checkToxic = data?.data?.response;

        if (checkToxic[1] >= 0.5) {
          const toxicDetection = await new ToxicDetection({
            id_comment: req.body._id,
            content: req.body.commentContent,
            id_account: decodedToken.id_account,
            type: 'comment',
          });

          await toxicDetection.save();

          const newWarningAmount = existedAccount?.warningAmount + 1;

          switch (newWarningAmount) {
            case 3:
              await Account.findOneAndUpdate(
                { _id: decodedToken.id_account },
                { isBlocked: true, warningAmount: newWarningAmount },
              );

              const block3Notification = await new Notification({
                id_senders: [process.env.ADMIN_ID],
                id_receiver: decodedToken.id_account,
                notificationType: 'block',
                notificationEnglishContent: `Your account has been blocked due to inappropriate language use. You will not be able to post or comment for the next 3 days.`,
                notificationVietnameseContent: `Tài khoản của bạn đã bị khóa do sử dụng ngôn từ không phù hợp. Bạn sẽ không thể đăng bài hoặc bình luận trong 3 ngày tới.`,
                notificationTime: new Date(),
                isViewed: false,
              });
              await block3Notification.save();

              const unblock3Date = add(new Date(), { days: 3 });
              schedule.scheduleJob(unblock3Date, async function () {
                await Account.findOneAndUpdate({ _id: decodedToken.id_account }, { isBlocked: false });
                const unblock3Notification = await new Notification({
                  id_senders: [process.env.ADMIN_ID],
                  id_receiver: decodedToken.id_account,
                  notificationType: 'unblock',
                  notificationEnglishContent: `Your account has been unblocked.`,
                  notificationVietnameseContent: `Tài khoản của bạn đã được mở khóa.`,
                  notificationTime: new Date(unblock3Date),
                  isViewed: false,
                });
                await unblock3Notification.save();
              });
              break;
            case 5:
              await Account.findOneAndUpdate(
                { _id: decodedToken.id_account },
                { isBlocked: true, warningAmount: newWarningAmount },
              );

              const block5Notification = await new Notification({
                id_senders: [process.env.ADMIN_ID],
                id_receiver: decodedToken.id_account,
                notificationType: 'block',
                notificationEnglishContent: `Your account has been blocked due to inappropriate language use. You will not be able to post or comment for the next 7 days.`,
                notificationVietnameseContent: `Tài khoản của bạn đã bị khóa do sử dụng ngôn từ không phù hợp. Bạn sẽ không thể đăng bài hoặc bình luận trong 7 ngày tới.`,
                notificationTime: new Date(),
                isViewed: false,
              });
              await block5Notification.save();

              const unblock5Date = add(new Date(), { days: 7 });
              schedule.scheduleJob(unblock5Date, async function () {
                await Account.findOneAndUpdate({ _id: decodedToken.id_account }, { isBlocked: false });
                const unblock5Notification = await new Notification({
                  id_senders: [process.env.ADMIN_ID],
                  id_receiver: decodedToken.id_account,
                  notificationType: 'unblock',
                  notificationEnglishContent: `Your account has been unblocked.`,
                  notificationVietnameseContent: `Tài khoản của bạn đã được mở khóa.`,
                  notificationTime: new Date(unblock5Date),
                  isViewed: false,
                });
                await unblock5Notification.save();
              });
              break;
            case 7:
              await Account.findOneAndUpdate(
                { _id: decodedToken.id_account },
                { isBlocked: true, warningAmount: newWarningAmount },
              );

              const block7Notification = await new Notification({
                id_senders: [process.env.ADMIN_ID],
                id_receiver: decodedToken.id_account,
                notificationType: 'block',
                notificationEnglishContent: `Your account has been blocked due to inappropriate language use. You will not be able to post or comment for the next 30 days.`,
                notificationVietnameseContent: `Tài khoản của bạn đã bị khóa do sử dụng ngôn từ không phù hợp. Bạn sẽ không thể đăng bài hoặc bình luận trong 30 ngày tới.`,
                notificationTime: new Date(),
                isViewed: false,
              });
              await block7Notification.save();

              const unblock7Date = add(new Date(), { days: 30 });
              schedule.scheduleJob(unblock7Date, async function () {
                await Account.findOneAndUpdate({ _id: decodedToken.id_account }, { isBlocked: false });
                const unblock7Notification = await new Notification({
                  id_senders: [process.env.ADMIN_ID],
                  id_receiver: decodedToken.id_account,
                  notificationType: 'unblock',
                  notificationEnglishContent: `Your account has been unblocked.`,
                  notificationVietnameseContent: `Tài khoản của bạn đã được mở khóa.`,
                  notificationTime: new Date(unblock7Date),
                  isViewed: false,
                });
                await unblock7Notification.save();
              });
              break;
            default:
              await Account.findOneAndUpdate({ _id: decodedToken.id_account }, { warningAmount: newWarningAmount });
              break;
          }
          res.status(400).json({
            message: 'inappropriate language comment',
          });
        } else {
          let uploadedResponse;
          if (req.body.commentImage) {
            const fileStr = req.body.commentImage;
            uploadedResponse = await cloudinary.uploader.upload(fileStr, {
              resource_type: 'image',
              upload_preset: 'comment_setups',
            });

            if (existedComment.commentImage) await cloudinary.uploader.destroy(existedComment.commentImage);

            const commentImg = await new VisualMedia({
              id_post: req.body.id_post,
              id_account: decodedToken.id_account,
              url: {
                visualType: 'comment',
                visualUrl: uploadedResponse?.public_id,
              },
            });
            await commentImg.save();

            await VisualMedia.findOneAndDelete({
              url: {
                visualType: 'comment',
                visualUrl: existedComment.commentImage,
              },
            });
          }

          await Comment.findOneAndUpdate(
            {
              _id: req.body._id,
              id_account: decodedToken.id_account,
            },
            {
              ...req.body,
              commentImage: uploadedResponse?.public_id,
            },
          )
            .then((result) => {
              if (!result) res.sendStatus(401);
              else {
                res.status(200).json({
                  message: 'comment updated',
                  comment: result,
                });
              }
            })
            .catch((err) => {
              res.status(500).json({
                error: err,
              });
            });
        }
      }
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [DELETE] /accounts/:id/delete_comment_post
exports.accounts_delete_comment_post = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);

    const existedComment = await Comment.findOne({
      _id: req.params.id,
      id_account: decodedToken.id_account,
    });
    if (!existedComment)
      res.status(400).json({
        error: 'Comment not existed',
      });

    const result = await Comment.findOneAndRemove({
      _id: req.params.id,
      id_account: decodedToken.id_account,
    });

    if (!result) {
      res.sendStatus(401);
    } else {
      if (existedComment.commentImage) await cloudinary.uploader.destroy(existedComment.commentImage);

      await VisualMedia.findOneAndDelete({
        url: {
          visualType: 'comment',
          visualUrl: existedComment.commentImage,
        },
      });

      res.status(200).json({
        message: 'comment removed',
        comment: result,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [GET] /accounts/friend_suggestion
exports.accounts_get_friend_suggestions = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
  await OtherInfo.findOne({ id_account: decodedToken.id_account }, { listFriend: 1 })
    .then(async (otherInfo) => {
      await Account.find({ _id: { $ne: decodedToken.id_account } }, { _id: 1 })
        .then(async (account) => {
          let notFriendList = await account.filter((value1) => !otherInfo.listFriend.includes(value1._id));
          await FriendRequest.find({ id_sender: decodedToken.id_account }, { _id: 0, id_receiver: 1 })
            .then(async (mySentRequest) => {
              let listSentRequest = [];
              for ([index, value] of mySentRequest.entries()) {
                listSentRequest.push(value.id_receiver.toString());
              }
              let firstFilteredList = await notFriendList.filter(
                (value1) => !listSentRequest.includes(value1._id.toString()),
              );
              await FriendRequest.find({ id_receiver: decodedToken.id_account }, { _id: 0, id_sender: 1 })
                .then(async (myReceivedRequest) => {
                  let listReceivedRequest = [];
                  for ([index, value] of myReceivedRequest.entries()) {
                    listReceivedRequest.push(value.id_sender.toString());
                  }
                  let secondFilteredList = await firstFilteredList.filter(
                    (value1) => !listReceivedRequest.includes(value1._id.toString()),
                  );
                  let friendSuggestionList = [];
                  let friendSuggestionInfo = {};
                  for ([index, notFriend] of secondFilteredList.entries()) {
                    await OtherInfo.findOne({ id_account: notFriend._id }, { id_account: 1, listFriend: 1, _id: 0 })
                      .then(async (listFriend) => {
                        let mutualFriends = await listFriend.listFriend.filter((value1) =>
                          otherInfo.listFriend.includes(value1),
                        );
                        await PersonalInfo.findOne({ id_account: listFriend.id_account }, { avatar: 1, fullName: 1 })
                          .then(async (personalInfo) => {
                            friendSuggestionInfo = {
                              id_account: listFriend.id_account,
                              avatar: personalInfo.avatar,
                              fullName: personalInfo.fullName,
                              mutualFriends: mutualFriends.length,
                            };
                            friendSuggestionList.push(friendSuggestionInfo);
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
                  }
                  friendSuggestionList.sort((a, b) => {
                    return b.mutualFriends - a.mutualFriends;
                  });
                  friendSuggestionList = friendSuggestionList.slice(0, 10);
                  res.status(200).json({
                    message: 'get friend suggestions successfully',
                    friendSuggestionList,
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

// [GET] /accounts/contact
exports.accounts_get_all_contacts = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
  await Conversation.find({ members: { $in: [decodedToken.id_account] }, status: true, name: '' })
    .then(async (conversations) => {
      let listContact = [];
      for (const [index, value] of conversations.entries()) {
        let contactInfo = {};
        const contact = await value.members.filter((member) => member != decodedToken.id_account);
        await PersonalInfo.findOne({ id_account: contact[0] }, { _id: 0, id_account: 1, avatar: 1, fullName: 1 })
          .then(async (personalInfo) => {
            contactInfo = {
              id_conversation: value._id,
              id_account: personalInfo.id_account,
              avatar: personalInfo.avatar,
              fullName: personalInfo.fullName,
            };
          })
          .catch((err) => {
            res.status(500).json({
              error: err,
            });
          });
        listContact.push(contactInfo);
      }
      res.status(200).json({
        message: 'get all contacts successfully',
        listContact,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [GET] /accounts/notification
exports.accounts_get_all_notifications = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const notifications = await Notification.find({ id_receiver: decodedToken.id_account }).sort({
      notificationTime: -1,
    });
    let listNotification = [];
    for (const [index, value] of notifications.entries()) {
      let notificationInfo = {};
      const id_account = await value.id_senders[value.id_senders.length - 1];
      const personalInfo = await PersonalInfo.findOne({ id_account: id_account }, { _id: 0, avatar: 1 });
      notificationInfo = {
        _id: value._id,
        id_senders: value.id_senders,
        id_receiver: value.id_receiver,
        id_post: value.id_post,
        id_comment: value.id_comment,
        notificationType: value.notificationType,
        notificationEnglishContent: value.notificationEnglishContent,
        notificationVietnameseContent: value.notificationVietnameseContent,
        notificationTime: value.notificationTime,
        isViewed: value.isViewed,
        avatar: personalInfo.avatar,
      };
      listNotification.push(notificationInfo);
      await Notification.findOneAndUpdate({ $and: [{ _id: value._id }, { isViewed: false }] }, { isViewed: true });
    }
    res.status(200).json({
      message: 'get all notifications successfully',
      listNotification,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
};

// [GET] /accounts/unviewed_notification_and_message
exports.accounts_get_unviewed_notifications_and_messages = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const notifications = await Notification.find({
      $and: [{ id_receiver: decodedToken.id_account }, { isViewed: false }],
    });
    const conversations = await Conversation.find({
      members: { $in: [decodedToken.id_account] },
    }).sort({
      updatedAt: -1,
    });
    let unviewedMessageAmount = 0;
    for (const [index, value] of conversations.entries()) {
      const message = await Message.find({ id_conversation: value._id }).sort({ createdAt: -1 }).limit(1);
      const latestMessage = message[0];

      if (latestMessage && !latestMessage?.viewedBy?.includes(decodedToken.id_account)) {
        unviewedMessageAmount++;
      }
    }

    res.status(200).json({
      message: 'get unviewed notifications and messages successfully',
      unviewedNotificationAmount: notifications.length,
      unviewedMessageAmount,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [POST] /accounts/reset_password
exports.reset_password = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const account = await Account.findOne({ _id: decodedToken.id_account });
    if (!account) {
      res.status(401).json({
        error: 'Account not existed',
      });
    } else {
      const passwordMatch = await bcrypt.compare(req.body.oldPassword, account.password);
      if (passwordMatch.toString() === 'false') {
        res.status(401).json({
          error: 'Old password is not correct',
        });
      } else {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);
        await Account.findOneAndUpdate({ _id: decodedToken.id_account }, { password: hashedPassword });
        res.status(200).json({
          message: 'reset password successfully',
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [POST] /accounts/send_code
exports.send_code = async (req, res, next) => {
  try {
    const account = await Account.findOne({ email: req.body.email });
    if (!account) {
      res.status(401).json({
        error: 'Account not existed',
      });
    } else {
      const code = await randomNumber(6);
      const personalInfo = await PersonalInfo.findOne({ id_account: account._id }, { fullName: 1 });
      await nodemailer.sendForgotPasswordCode(account.email, personalInfo?.fullName, code);
      await Account.findOneAndUpdate({ _id: account._id }, { code });
      res.status(200).json({
        message: 'send code successfully',
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [POST] /accounts/reset_forgotten_password
exports.reset_forgotten_password = async (req, res, next) => {
  try {
    const account = await Account.findOne({ email: req.body.email });
    if (!account) {
      res.status(401).json({
        error: 'Account not existed',
      });
    } else {
      const codeMatch = req.body.code.toString() === account.code.toString();
      if (codeMatch.toString() === 'false') {
        res.status(401).json({
          error: 'Code is not correct',
        });
      } else {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);
        await Account.findOneAndUpdate({ _id: account._id }, { password: hashedPassword, code: '' });
        res.status(200).json({
          message: 'reset forgotten password successfully',
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [GET] /accounts/setting
exports.setting = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const setting = await Setting.findOne({ id_account: decodedToken.id_account });
    res.status(200).json({
      message: 'get setting successfully',
      setting,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [PATCH] /accounts/update_setting
exports.update_setting = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const decodedToken = jwt_decode(token);
    const updatedSetting = await Setting.findOneAndUpdate(
      { id_account: decodedToken.id_account },
      { postDisplay: req.body.postDisplay, language: req.body.language },
    );
    res.status(200).json({
      message: 'setting updated successfully',
      updatedSetting,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};
