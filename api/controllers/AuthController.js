const jwt = require('jsonwebtoken');
const env = require('dotenv');
const bcrypt = require('bcrypt');
const jwt_decode = require('jwt-decode');
const nodemailer = require('../../utils/nodemailer');

const Account = require('../models/user/account');
const PersonalInfo = require('../models/user/personal_info');
const EducationInfo = require('../models/user/education_info');
const FavoriteInfo = require('../models/user/favorite_info');
const OtherInfo = require('../models/user/other_info');
const Setting = require('../models/user/setting');

env.config();

// [POST] /auth/signup
exports.auth_sign_up = async (req, res, next) => {
  try {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    const account = await new Account({ email: req.body.email, password: hashedPassword });
    await account
      .save()
      .then(async (result) => {
        const personal_info = await new PersonalInfo({
          id_account: account._id,
          fullName: req.body.fullName,
          aboutMe: `Hi, I'm ${req.body.fullName}. Nice to meet you.`,
          joined: new Date(),
        });
        await personal_info.save();
        const favorite_info = await new FavoriteInfo({
          id_account: account._id,
        });
        await favorite_info.save();
        const education_info = await new EducationInfo({
          id_account: account._id,
        });
        await education_info.save();
        const other_info = await new OtherInfo({
          id_account: account._id,
        });
        await other_info.save();
        const setting = await new Setting({
          id_account: account._id,
          postDisplay: 'slider',
        });
        await setting.save();
        await sendVerificationMail(req.body.email, req.body.fullName, account._id);
        res.status(201).json({
          message: 'account created',
          account: result,
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: err,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: error,
    });
  }
};

// [POST] auth/login
exports.auth_log_in = async (req, res, next) => {
  try {
    const account = await Account.findOne({ email: req.body.email });

    if (!account) {
      return res.status(401).json({
        message: 'Login information is incorrect',
      });
    } else {
      const passwordMatch = await bcrypt.compare(req.body.password, account.password);

      if (passwordMatch) {
        if (!account.isVerified) {
          return res.status(400).json({
            message: 'Your email has not been verified yet!',
          });
        } else {
          const user = { email: account.email, id_account: account._id };
          const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '100m' });
          const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);

          await Account.findOneAndUpdate({ email: account.email }, { refreshToken: refreshToken });

          const userInfo = await PersonalInfo.findOne(
            { id_account: account._id },
            { id_account: 1, avatar: 1, fullName: 1 },
          );

          const setting = await Setting.findOne({ id_account: account._id }, { postDisplay: 1 });

          res.status(200).json({
            message: 'Log in successfully',
            accessToken,
            refreshToken,
            id_account: userInfo.id_account,
            fullName: userInfo.fullName,
            avatar: userInfo.avatar,
            setting,
          });
        }
      } else {
        res.status(401).json({
          message: 'Login information is incorrect',
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [POST] auth/logout
exports.auth_log_out = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
  await Account.findOneAndUpdate({ _id: decodedToken.id_account }, { refreshToken: '' })
    .then(async (result) => {
      if (!result) {
        await res.status(401).json({
          message: 'Log out failed',
        });
      } else {
        if (!result.refreshToken) {
          await res.status(401).json({
            message: 'Log out failed',
          });
        } else {
          await res.status(200).json({
            message: 'Log out successfully',
          });
        }
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [POST] auth/token
exports.auth_refresh_token = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  const decodedToken = jwt_decode(token);
  await Account.findOne({ email: decodedToken.email }, { refreshToken: 1, email: 1, _id: 1 })
    .then(async (result) => {
      if (!result.refreshToken) return res.sendStatus(403);

      const user = { email: result.email, id_account: result._id };
      jwt.verify(result.refreshToken, process.env.REFRESH_TOKEN_SECRET, (err) => {
        if (err) return res.sendStatus(403);
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15s' });
        res.json({ accessToken });
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// [POST] auth/send_verification_mail
exports.send_verification_mail = async (req, res, next) => {
  try {
    await nodemailer.sendVerificationMail(req.body.email, req.body.fullName, req.body.id_account).then(() => {
      res.status(201).json({
        message: 'mail sent successfully',
      });
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// [GET] auth/verify/:id
exports.verify_account = async (req, res, next) => {
  try {
    const account = await Account.findOneAndUpdate({ _id: req.params.id }, { isVerified: true });
    res.redirect('https://kreat-ui.vercel.app/authentication');
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};
