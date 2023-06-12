const Account = require('../models/user/account');
const PersonalInfo = require('../models/user/personal_info');
const FavoriteInfo = require('../models/user/favorite_info');
const EducationInfo = require('../models/user/education_info');
const OtherInfo = require('../models/user/other_info');
const React = require('../models/post/react');
const Comment = require('../models/post/comment');
const Post = require('../models/post/post');
const FriendRequest = require('../models/request/friend_request');
const VisualMedia = require('../models/post/visual_media');
const Conversation = require('../models/chat/conversation');

const { cloudinary } = require('../../utils/cloudinary');

const jwt_decode = require('jwt-decode');
const mongoose = require('mongoose');

// [GET] /accounts/:id/timeline
exports.accounts_get_timeline_info = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await OtherInfo.findOne({ id_account: decodedToken.id_account }, { _id: 0, listFriend: 1 })
    .then(async (myFriends) => {
      let friendStatus = '';
      let id_friendRequest = '';
      const isFriend = await myFriends.listFriend.includes(req.params.id);
      if (isFriend) {
        friendStatus = 'friend';
      } else {
        await FriendRequest.findOne({ id_sender: decodedToken.id_account, id_receiver: req.params.id })
          .then(async (sentRequest) => {
            if (sentRequest) {
              friendStatus = 'friend request sent';
              id_friendRequest = sentRequest._id.toString();
            } else {
              await FriendRequest.findOne({ id_receiver: decodedToken.id_account, id_sender: req.params.id })
                .then((receivedRequest) => {
                  if (receivedRequest) {
                    friendStatus = 'friend request received';
                    id_friendRequest = receivedRequest._id.toString();
                  } else {
                    friendStatus = 'not friend';
                  }
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
      }
      await PersonalInfo.findOne({ id_account: req.params.id }, { id_account: 1, avatar: 1, fullName: 1 })
        .then(async (personalInfo) => {
          await Post.find({ id_account: personalInfo.id_account })
            .sort({ createdAt: -1 })
            .then(async (listPost) => {
              let list = listPost;
              for ([index, value] of list.entries()) {
                await React.find({ id_post: value._id }, { reactType: 1, id_account: 1 }).then(async (results) => {
                  let listReaction = [];
                  for (result of results) {
                    await PersonalInfo.findOne(
                      { id_account: result.id_account },
                      { fullName: 1, avatar: 1, reactType: result.reactType },
                    ).then((personal_info) => {
                      listReaction.push(personal_info);
                    });
                  }
                  let post = list[index];
                  list[index] = {
                    post,
                    listReaction,
                  };
                });
                await Comment.find({ id_post: value._id }).then(async (results) => {
                  list[index] = {
                    ...list[index],
                    amountComment: results.length,
                  };
                });
              }
              return await list;
            })
            .then((listPost) => {
              res.status(200).json({
                message: 'get timeline info successfully',
                avatar: personalInfo.avatar,
                fullName: personalInfo.fullName,
                friendStatus,
                id_friendRequest,
                timeline: listPost,
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

// [GET] /accounts/:id/about
exports.accounts_get_about_info = async (req, res, next) => {
  await PersonalInfo.findOne({ id_account: req.params.id })
    .then(async (personalInfo) => {
      if (!personalInfo) {
        res.status(404).json({
          message: 'account not found',
        });
      } else {
        await FavoriteInfo.findOne({ id_account: req.params.id })
          .then(async (favoriteInfo) => {
            await EducationInfo.findOne({ id_account: req.params.id })
              .then((educationInfo) => {
                res.status(200).json({
                  message: 'get about info successfully',
                  about: {
                    personalInfo,
                    favoriteInfo,
                    educationInfo,
                  },
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
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [GET] /accounts/:id/friends
exports.accounts_get_all_friends = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await OtherInfo.findOne({ id_account: decodedToken.id_account }, { listFriend: 1 })
    .then(async (myInfo) => {
      await OtherInfo.findOne({ id_account: req.params.id }, { listFriend: 1 })
        .then(async (result) => {
          let listFriend = [];
          for ([index, value] of result.listFriend.entries()) {
            let friendInfo = {};
            let mutualFriends = [];
            await PersonalInfo.findOne({ id_account: value }, { avatar: 1, fullName: 1, aboutMe: 1 })
              .then(async (personalInfo) => {
                if (value == decodedToken.id_account) {
                  friendInfo = {
                    id_account: value,
                    avatar: personalInfo.avatar,
                    fullName: personalInfo.fullName,
                    aboutMe: personalInfo.aboutMe,
                    friendAmount: myInfo.listFriend.length,
                  };
                } else {
                  await OtherInfo.findOne({ id_account: value }, { listFriend: 1 })
                    .then(async (otherInfo) => {
                      mutualFriends = await otherInfo.listFriend.filter((value1) => myInfo.listFriend.includes(value1));
                      friendInfo = {
                        id_account: value,
                        avatar: personalInfo.avatar,
                        fullName: personalInfo.fullName,
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
            listFriend.push(friendInfo);
          }
          res.status(200).json({
            message: 'get all friends successfully',
            listFriend,
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

// [GET] /accounts/:id/visual_media
exports.accounts_get_visual_media_info = async (req, res, next) => {
  await VisualMedia.find({ id_account: req.params.id }, { url: 1 })
    .then((listURL) => {
      res.status(200).json({
        message: 'get all images and videos successfully',
        listURL,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [PATCH] /accounts/update_personal_info
exports.accounts_update_personal_info = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await PersonalInfo.findOneAndUpdate({ id_account: decodedToken.id_account }, req.body, { new: true })
    .then(async (result) => {
      if (req.body.avatarData) {
        const fileStr = req.body.avatarData;
        let uploadedResponse = await cloudinary.uploader.upload(fileStr, {
          resource_type: 'image',
          upload_preset: 'avatar_setups',
        });
        await PersonalInfo.findOneAndUpdate(
          { id_account: decodedToken.id_account },
          { avatar: uploadedResponse.public_id },
        )
          .then((result2) => {})
          .catch((err) => {
            res.status(500).json({
              error: err,
            });
          });
      }
      res.status(200).json({
        message: 'update successfully',
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [PATCH] /accounts/update_favorite_info
exports.accounts_update_favorite_info = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
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

  var decodedToken = jwt_decode(token);
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

  var decodedToken = jwt_decode(token);
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

  var decodedToken = jwt_decode(token);
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

  var decodedToken = jwt_decode(token);
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
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await FriendRequest.find({ id_receiver: decodedToken.id_account }, { id_sender: 1 })
    .then(async (senders) => {
      await OtherInfo.findOne({ id_account: decodedToken.id_account }, { listFriend: 1 })
        .then(async (result) => {
          let listRequest = [];
          for ([index, value] of senders.entries()) {
            let friendRequestInfo = {};
            let mutualFriends = [];
            await PersonalInfo.findOne({ id_account: value.id_sender }, { fullName: 1, avatar: 1, aboutMe: 1 })
              .then(async (personalInfo) => {
                await OtherInfo.findOne({ id_account: value.id_sender }, { listFriend: 1 })
                  .then(async (otherInfo) => {
                    mutualFriends = await otherInfo.listFriend.filter((value1) => {
                      for (value2 of result.listFriend) {
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
            listRequest.push(friendRequestInfo);
          }
          res.status(200).json({
            message: 'get all friend requests successfully',
            listRequest,
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

// [POST] /accounts/send_friend_request
exports.accounts_send_friend_request = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);

  const friendRequest = await new FriendRequest({
    id_sender: decodedToken.id_account,
    id_receiver: req.body.id_receiver,
  });

  try {
    await friendRequest.save();
    res.status(201).json({
      message: 'friend request sended successfully',
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
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await FriendRequest.findOne({ id_sender: decodedToken.id_account, id_receiver: req.params.id })
    .then(async (friendRequest) => {
      if (decodedToken.id_account != friendRequest.id_sender) {
        res.sendStatus(401);
      } else {
        await FriendRequest.findOneAndDelete({ _id: friendRequest._id })
          .then((result) => {
            res.status(200).json({
              message: 'friend request canceled',
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

// [DELETE] /accounts/:id/accept_friend_request
exports.accounts_accept_friend_request = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);

  await FriendRequest.findOne({ _id: req.params.id })
    .then(async (friendRequest) => {
      if (decodedToken.id_account != friendRequest.id_receiver) {
        res.sendStatus(401);
      } else {
        const infoSender = await OtherInfo.findOne({ id_account: friendRequest.id_sender });
        try {
          const updatedListFriend = [...infoSender.listFriend, friendRequest.id_receiver];
          infoSender.listFriend = updatedListFriend;
          await infoSender.save();
        } catch (error) {
          res.status(500).json({
            error,
          });
        }
        const infoReceiver = await OtherInfo.findOne({ id_account: friendRequest.id_receiver });
        try {
          const updatedListFriend = [...infoReceiver.listFriend, friendRequest.id_sender];
          infoReceiver.listFriend = updatedListFriend;
          await infoReceiver.save();
        } catch (error) {
          res.status(500).json({
            error,
          });
        }
        await FriendRequest.findOneAndDelete({ _id: req.params.id })
          .then(async (result) => {
            await Conversation.find({ members: { $in: [decodedToken.id_account] }, status: false })
              .then(async (conversations) => {
                let flag = 0;
                for ([index, value] of conversations.entries()) {
                  const contact = await value.members.filter((member) => member != decodedToken.id_account);
                  if (contact[0] == friendRequest.id_sender) {
                    flag = 1;
                    await Conversation.findOneAndUpdate({ _id: value._id }, { status: true })
                      .then(async (conv) => {
                        return await res.status(200).json({
                          message: 'friend request accepted',
                          friendRequest: result,
                        });
                      })
                      .catch((err) => {
                        res.status(500).json({
                          error: err,
                        });
                      });
                  }
                }
                if (flag == 0) {
                  const newConversation = await Conversation({
                    members: [decodedToken.id_account, friendRequest.id_sender.toString()],
                    status: true,
                  });
                  await newConversation
                    .save()
                    .then((conversation) => {
                      res.status(200).json({
                        message: 'friend request accepted',
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

// [DELETE] /accounts/:id/decline_friend_request
exports.accounts_decline_friend_request = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);

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
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  OtherInfo.findOne({ id_account: decodedToken.id_account }, { listFriend: 1 })
    .then(async (myListFriend) => {
      if (myListFriend.listFriend.includes(req.params.id)) {
        const friendRemovedArray = await myListFriend.listFriend.filter((friend) => friend != req.params.id);
        await OtherInfo.findOneAndUpdate({ id_account: decodedToken.id_account }, { listFriend: friendRemovedArray })
          .then(async (firstRemove) => {
            const friendRemovedArray2 = await OtherInfo.findOne({ id_account: req.params.id }, { listFriend: 1 });
            const secondRemove = await friendRemovedArray2.listFriend.filter(
              (friend) => friend != decodedToken.id_account,
            );
            await OtherInfo.findOneAndUpdate({ id_account: req.params.id }, { listFriend: secondRemove })
              .then(async (result) => {
                Conversation.find({ members: { $in: [decodedToken.id_account] }, status: true })
                  .then(async (conversations) => {
                    for ([index, value] of conversations.entries()) {
                      const unfrienedFriend = await value.members.filter((member) => member != decodedToken.id_account);
                      if (unfrienedFriend[0] == req.params.id) {
                        await Conversation.findOneAndUpdate({ _id: value._id }, { status: false })
                          .then((result2) => {
                            return res.status(200).json({
                              message: 'unfriend successfully',
                            });
                          })
                          .catch((err) => {
                            res.status(500).json({
                              error: err,
                            });
                          });
                      }
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
          })
          .catch((err) => {
            res.status(500).json({
              error: err,
            });
          });
      } else {
        res.status(500).json({
          message: 'this person is not your friend',
        });
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [POST] /accounts/react
exports.accounts_react = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  const react = await new React({
    id_account: decodedToken.id_account,
    ...req.body,
  });
  await Post.findOne({ _id: req.body.id_post }).then(async (post) => {
    if (!post) {
      await Comment.findOne({ _id: req.body.id_comment }).then(async (comment) => {
        if (!comment) res.status(404).json({ message: 'post or comment not found' });
        else {
          await react
            .save()
            .then((result) => {
              res.status(201).json({
                message: 'reaction on comment stored',
                reaction: result,
              });
            })
            .catch((err) => {
              res.status(500).json({
                error: err,
              });
            });
        }
      });
    } else {
      await react
        .save()
        .then((result) => {
          res.status(201).json({
            message: 'reaction on post stored',
            reaction: result,
          });
        })
        .catch((err) => {
          res.status(500).json({
            error: err,
          });
        });
    }
  });
};

// [PATCH] /accounts/update_react
exports.accounts_update_react = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
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
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await React.findOneAndRemove({
    id_post: req.params.id,
    id_account: decodedToken.id_account,
  })
    .then(async (result) => {
      if (!result) await res.sendStatus(401);
      else {
        await res.status(200).json({
          message: 'reaction on post removed',
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

// [DELETE] /accounts/:id/unreact_comment
exports.accounts_unreact_comment = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await React.findOneAndRemove({
    id_comment: req.params.id,
    id_account: decodedToken.id_account,
  })
    .then(async (result) => {
      if (!result) await res.sendStatus(401);
      else {
        await res.status(200).json({
          message: 'reaction on comment removed',
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

// [POST] /accounts/comment_post
exports.accounts_comment_post = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  const comment = await new Comment({
    id_account: decodedToken.id_account,
    ...req.body,
  });
  await Post.findOne({ _id: req.body.id_post })
    .then(async (post) => {
      if (!post) res.status(404).json({ message: 'post not found' });
      else {
        await comment
          .save()
          .then((result) => {
            res.status(201).json({
              message: 'comment stored',
              comment: result,
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

// [PATCH] /accounts/update_comment_post
exports.accounts_update_comment_post = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await Comment.findOneAndUpdate(
    {
      _id: req.body.id_comment,
      id_account: decodedToken.id_account,
    },
    req.body,
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
};

// [DELETE] /accounts/:id/delete_comment_post
exports.accounts_delete_comment_post = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
  await Comment.findOneAndRemove({
    _id: req.params.id,
    id_account: decodedToken.id_account,
  })
    .then((result) => {
      if (!result) res.sendStatus(401);
      else {
        res.status(200).json({
          message: 'comment removed',
          comment: result,
        });
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [GET] /accounts/friend_suggestion
exports.accounts_get_friend_suggestions = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  var decodedToken = jwt_decode(token);
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

  var decodedToken = jwt_decode(token);
  await Conversation.find({ members: { $in: [decodedToken.id_account] }, status: true })
    .then(async (conversations) => {
      let listContact = [];
      for ([index, value] of conversations.entries()) {
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
