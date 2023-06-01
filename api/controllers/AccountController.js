const mongoose = require('mongoose');

const Account = require('../models/user/account');
const PersonalInfo = require('../models/user/personal_info');
const FavoriteInfo = require('../models/user/favorite_info');
const EducationInfo = require('../models/user/education_info');
const OtherInfo = require('../models/user/other_info');
const React = require('../models/post/react');
const Comment = require('../models/post/comment');

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
