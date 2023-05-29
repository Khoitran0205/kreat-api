const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const env = require('dotenv');
const bcrypt = require('bcrypt');

const Account = require('../models/user/account');
const PersonalInfo = require('../models/user/personal_info');
const EducationInfo = require('../models/user/education_info');
const FavoriteInfo = require('../models/user/favorite_info');
const OtherInfo = require('../models/user/other_info');
const account = require('../models/user/account');

env.config();

// Sign up
router.post('/signup', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        const account = new Account({
            email: req.body.email,
            password: hashedPassword,
        });
        account.save()
        .then(result => {
            res.status(201).json({
                message: "account created",
                account: result
            })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        });
        const personal_info = new PersonalInfo({
            id_account: account._id,
        })
        personal_info.save();
        const favorite_info = new FavoriteInfo({
            id_account: account._id,
        })
        favorite_info.save();
        const education_info = new EducationInfo({
            id_account: account._id,
        })
        education_info.save();
        const other_info = new OtherInfo({
            id_account: account._id,
        })
        other_info.save();
    } catch (error) {
        res.status(500).json({
            error: error
        })
    }
});


// Log in
router.post('/login', async (req, res) => {
    Account.findOne({email: req.body.email})
        .then(async account => {
            if (!account) res.status(400).json({
                message: "Log in failed"
            })
            try {
                if (await bcrypt.compare(req.body.password, account.password)) {
                    const user = { email: account.email };
                    const accessToken = jwt.sign(
                        user, 
                        process.env.ACCESS_TOKEN_SECRET, 
                        { expiresIn: '15s'}
                    )
                    const refreshToken = jwt.sign(
                        user,
                        process.env.REFRESH_TOKEN_SECRET
                    )

                    Account.findOneAndUpdate({email: account.email}, {refreshToken: refreshToken})
                        .then(result => {
                            
                        })
                        .catch(err => {
                            res.status(500).json({
                            error: err
                            })
                        })

                    res.status(200).json({
                        message: 'Log in successfully',
                        accessToken,
                        refreshToken
                    })
                } else {
                    res.status(401).json({
                        message: 'Log in failed'
                    })
                }
            } catch (error) {
                res.status(502).json({
                    error
                })
            }
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })
})

// Log out
router.post('/logout', (req, res) => {
    Account.findOneAndUpdate({email: req.body.email}, {refreshToken: ''})
        .then(result => {
            if (!result) res.status(401).json({
                message: 'Log out failed'
            })
            if (!result.refreshToken) res.status(401).json({
                message: 'Log out failed'
            })
            res.status(200).json({
                message: 'Log out successfully & refresh token deleted'
            })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })
})

// Refresh token
router.post('/token', (req, res) => {
    Account.findOne({email: req.body.email}, {refreshToken: 1})
        .then(result => {
            if (!result.refreshToken) return res.sendStatus(403);

            jwt.verify(result.refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403);
            const accessToken = jwt.sign(
                user, 
                process.env.ACCESS_TOKEN_SECRET, 
                { expiresIn: '15s'}
            );
            res.json({accessToken})
            })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })
    
})

module.exports = router;
