const mongoose = require('mongoose');

const Account = require('../models/account');


// [POST] /accounts/signup
exports.accounts_create_account = (req, res, next) => {
    const account = new Account({
        email: req.body.email,
        password: req.body.password,
        fullName: req.body.fullName,
        gender: req.body.gender,
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
}


// [GET] /accounts/search
exports.accounts_search_accounts = (req, res, next) => {
    const p = req.query.q;
    console.log(p);
    Account.find({ fullName: new RegExp(p, 'i') })
        .then(results => {
            res.status(200).json({
                accounts: results
            })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        });
}