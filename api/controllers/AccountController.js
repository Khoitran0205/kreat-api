const mongoose = require('mongoose');

const PersonalInfo = require('../models/user/personal_info');
const FavoriteInfo = require('../models/user/favorite_info');
const EducationInfo = require('../models/user/education_info');
const OtherInfo = require('../models/user/other_info');
const React = require('../models/post/react');
const Comment = require('../models/post/comment');
const Post = require('../models/post/post');

// [GET] /accounts/:id/timeline
exports.accounts_get_timeline_info = (req, res, next) => {
  Post.find({ id_account: req.params.id })
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
        timeline: listPost,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [GET] /accounts/:id/about
exports.accounts_get_about_info = (req, res, next) => {
  PersonalInfo.findOne({ id_account: req.params.id })
    .then((personalInfo) => {
      if (!personalInfo) {
        res.status(404).json({
          message: 'account not found',
        });
      } else {
        FavoriteInfo.findOne({ id_account: req.params.id })
          .then((favoriteInfo) => {
            EducationInfo.findOne({ id_account: req.params.id })
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
  OtherInfo.findOne({ id_account: req.params.id }, { listFriend: 1 })
    .then(async (result) => {
      let listFriend = [];
      for ([index, value] of result.listFriend.entries()) {
        let friendInfo = {};
        let mutualFriends = [];
        await PersonalInfo.findOne({ id_account: value }, { fullName: 1, avatar: 1, aboutMe: 1 }).then(
          async (personalInfo) => {
            await OtherInfo.findOne({ id_account: value }, { listFriend: 1 })
              .then(async (otherInfo) => {
                mutualFriends = await otherInfo.listFriend.filter((value1) => {
                  for (value2 of result.listFriend) {
                    return value1 === value2;
                  }
                });
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
          },
        );
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
};

// [PATCH] /accounts/:id/update_personal_info
exports.accounts_update_personal_info = (req, res, next) => {
  PersonalInfo.findOneAndUpdate({ id_account: req.params.id }, req.body)
    .then((result) => {
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

// [PATCH] /accounts/:id/update_favorite_info
exports.accounts_update_favorite_info = (req, res, next) => {
  FavoriteInfo.findOneAndUpdate({ id_account: req.params.id }, req.body)
    .then((result) => {
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

// [PATCH] /accounts/:id/update_education_info
exports.accounts_update_education_info = (req, res, next) => {
  EducationInfo.findOneAndUpdate({ id_account: req.params.id }, req.body)
    .then((result) => {
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

// [PATCH] /accounts/:id/update_other_info
exports.accounts_update_other_info = (req, res, next) => {
  OtherInfo.findOneAndUpdate({ id_account: req.params.id }, req.body)
    .then((result) => {
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

// [GET] /accounts/search
exports.accounts_search_accounts = (req, res, next) => {
  const p = req.query.q;
  PersonalInfo.find({ fullName: new RegExp(p, 'i') })
    .then((results) => {
      res.status(200).json({
        amount: results.length,
        accounts: results,
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
  const p = req.query.q;
  await OtherInfo.findOne({ id_account: req.params.id }, { listFriend: 1 })
    .then(async (result) => {
      let friendInfos = [];
      for ([index, value] of result.listFriend.entries()) {
        await PersonalInfo.findOne({ id_account: value }, { fullName: 1, id_account: 1 })
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
        await PersonalInfo.findOne({ id_account: value.id_account }, { avatar: 1, aboutMe: 1 }).then(
          async (personalInfo) => {
            await OtherInfo.findOne({ id_account: value.id_account }, { listFriend: 1 })
              .then(async (otherInfo) => {
                mutualFriends = await otherInfo.listFriend.filter((value1) => {
                  for (value2 of result.listFriend) {
                    return value1 === value2;
                  }
                });
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
          },
        );
        listFriend.push(friendInfo);
      }
      res.json({
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

// [POST] /accounts/:id/react
exports.accounts_react = (req, res, next) => {
  const react = new React({
    id_account: req.params.id,
    ...req.body,
  });
  react
    .save()
    .then((result) => {
      res.status(201).json({
        message: 'reaction stored',
        reaction: result,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [PATCH] /accounts/:id/update_react
exports.accounts_update_react = (req, res, next) => {
  React.findOneAndUpdate(
    {
      id_account: req.params.id,
      id_post: req.body.id_post,
      id_comment: req.body.id_comment,
    },
    req.body,
  )
    .then((result) => {
      res.status(200).json({
        message: 'reaction updated',
        reaction: result,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [DELETE] /accounts/:id/unreact
exports.accounts_unreact = (req, res, next) => {
  React.findOneAndRemove({
    id_account: req.params.id,
    id_post: req.body.id_post,
    id_comment: req.body.id_comment,
  })
    .then((result) => {
      res.status(200).json({
        message: 'reaction removed',
        reaction: result,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [POST] /accounts/:id/comment_post
exports.accounts_comment_post = (req, res, next) => {
  const comment = new Comment({
    id_account: req.params.id,
    ...req.body,
  });
  comment
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
};

// [PATCH] /accounts/:id/update_comment_post
exports.accounts_update_comment_post = (req, res, next) => {
  Comment.findOneAndUpdate(
    {
      _id: req.body.id_comment,
    },
    req.body,
  )
    .then((result) => {
      res.status(200).json({
        message: 'comment updated',
        comment: result,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [DELETE] /accounts/:id/delete_comment_post
exports.accounts_delete_comment_post = (req, res, next) => {
  Comment.findOneAndRemove({
    _id: req.body.id_comment,
  })
    .then((result) => {
      res.status(200).json({
        message: 'comment removed',
        comment: result,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};
