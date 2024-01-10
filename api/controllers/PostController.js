const Post = require('../models/post/post');
const Account = require('../models/user/account');
const PersonalInfo = require('../models/user/personal_info');
const OtherInfo = require('../models/user/other_info');
const React = require('../models/post/react');
const Comment = require('../models/post/comment');
const VisualMedia = require('../models/post/visual_media');
const Notification = require('../models/notification');
const schedule = require('node-schedule');
const env = require('dotenv');

const axios = require('axios');

const { cloudinary } = require('../../utils/cloudinary');

const jwt_decode = require('jwt-decode');

env.config();

// [POST] /posts/create_post
exports.posts_create_post = async (req, res, next) => {
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
        comments: req.body.postContent || '',
      });
      const checkToxic = data?.data?.response;
      if (checkToxic[1] >= 0.5) {
        const toxicDetection = await new ToxicDetection({
          content: req.body.postContent,
          id_account: decodedToken.id_account,
          type: 'post',
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
          message: 'inappropriate language post',
        });
      } else {
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
                chunk_size: 6000000,
                eager: [
                  { width: 300, height: 300, crop: 'pad', audio_codec: 'none' },
                  {
                    width: 160,
                    height: 100,
                    crop: 'crop',
                    gravity: 'south',
                    audio_codec: 'none',
                  },
                ],
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
          isActive: req.body.isScheduled?.toString() === 'true' ? false : true,
          createdAt: req.body.isScheduled?.toString() === 'true' ? new Date(req.body.scheduleDate) : new Date(),
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

        if (req.body.isScheduled?.toString() === 'true') {
          schedule.scheduleJob(new Date(req.body.scheduleDate), async function () {
            await Post.findOneAndUpdate({ _id: result._id }, { isActive: true });
            const newNotification = await new Notification({
              id_senders: [process.env.ADMIN_ID],
              id_receiver: decodedToken.id_account,
              id_post: result._id,
              notificationType: 'upload',
              notificationEnglishContent: `Your post has been published.`,
              notificationVietnameseContent: `Bài viết của bạn đã được đăng tải.`,
              notificationTime: new Date(req.body.scheduleDate),
              isViewed: false,
            });
            await newNotification.save();
          });
        }

        if (result.id_friendTag.length !== 0) {
          const personalInfo = await PersonalInfo.findOne(
            { id_account: decodedToken.id_account },
            { _id: 0, fullName: 1 },
          );
          for (const [index, value] of result.id_friendTag.entries()) {
            const newNotification = new Notification({
              id_senders: [decodedToken.id_account],
              id_receiver: value,
              id_post: result._id,
              id_comment: null,
              notificationType: 'tag',
              notificationEnglishContent: `${personalInfo.fullName} tagged you in a post.`,
              notificationVietnameseContent: `${personalInfo.fullName} đã gắn thẻ bạn trong một bài viết.`,
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
      }
    }
  } catch (error) {
    console.log(error);
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

    const existedAccount = await Account.findOne({ _id: decodedToken.id_account });
    const { isBlocked } = existedAccount;

    if (isBlocked) {
      res.status(406).json({
        message: 'this account is blocked',
      });
    } else {
      const data = await axios.post(process.env.TOXIC_COMMENT_API, {
        comments: req.body.postContent || '',
      });
      const checkToxic = data?.data?.response;
      if (checkToxic[1] >= 0.5) {
        const toxicDetection = await new ToxicDetection({
          content: req.body.postContent,
          id_account: decodedToken.id_account,
          type: 'post',
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
          message: 'inappropriate language post',
        });
      } else {
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
          shared_id_account: sharedPersonalInfo?.id_account,
          shared_id_visualMedia: sharedPost?.id_visualMedia,
          shared_postContent: sharedPost?.postContent,
          shared_postFeeling: sharedPost?.postFeeling,
          shared_postPrivacy: sharedPost?.postPrivacy,
          shared_createdAt: sharedPost?.createdAt,
          shared_id_friendTag: sharedPost?.id_friendTag,
          shared_location: sharedPost?.location,
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
                notificationEnglishContent:
                  shareAmmount == 2
                    ? `${personalInfo.fullName} and ${shareAmmount - 1} other person shared your post.`
                    : `${personalInfo.fullName} and ${shareAmmount - 1} other people shared your post.`,
                notificationVietnameseContent: `${personalInfo.fullName} và ${
                  shareAmmount - 1
                } người khác đã chia sẻ một bài viết của bạn.`,
                isViewed: false,
                notificationTime: new Date(),
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
                  ? `${personalInfo.fullName} and ${shareAmmount} other person shared your post.`
                  : `${personalInfo.fullName} and ${shareAmmount} other people shared your post.`,
              notificationVietnameseContent: `${personalInfo.fullName} và ${shareAmmount} người khác đã chia sẻ một bài viết của bạn.`,
              isViewed: false,
              notificationTime: new Date(),
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
            notificationEnglishContent: `${personalInfo.fullName} shared your post.`,
            notificationVietnameseContent: `${personalInfo.fullName} đã chia sẻ một bài viết của bạn.`,
            isViewed: false,
            notificationTime: new Date(),
          });
          await newNotification.save();
        }

        res.status(201).json({
          message: 'shared post created!',
          id_notification_receivers: [sharedPost.id_account],
          post: result,
        });
      }
    }
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

    const existedAccount = await Account.findOne({ _id: decodedToken.id_account });
    const { isBlocked } = existedAccount;

    if (isBlocked) {
      res.status(406).json({
        message: 'this account is blocked',
      });
    } else {
      const data = await axios.post(process.env.TOXIC_COMMENT_API, {
        comments: req.body.postContent || '',
      });
      const checkToxic = data?.data?.response;
      if (checkToxic[1] >= 0.5) {
        const toxicDetection = await new ToxicDetection({
          content: req.body.postContent,
          id_account: decodedToken.id_account,
          id_post: req.body._id,
          type: 'post',
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
          message: 'inappropriate language post',
        });
      } else {
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
      }
    }
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
        { $and: [{ postPrivacy: 'public' }, { isActive: true }] },
        {
          $and: [
            { postPrivacy: 'friend' },
            { isActive: true },
            { $or: [{ id_account: { $in: myListFriend.listFriend } }, { id_account: decodedToken.id_account }] },
          ],
        },
        { $and: [{ postPrivacy: 'private' }, { isActive: true }, { id_account: decodedToken.id_account }] },
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

      const id_friendTag = [];
      if (value?.id_friendTag?.length > 0) {
        for (let i = 0; i < value?.id_friendTag?.length; i++) {
          const id = value?.id_friendTag[i];
          const taggedFriendPersonalInfo = await PersonalInfo.findOne({ id_account: id }, { fullName: 1 });
          id_friendTag.push({
            id_account: id,
            fullName: taggedFriendPersonalInfo?.fullName,
          });
        }
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
        id_friendTag: id_friendTag,
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
