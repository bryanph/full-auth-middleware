'use strict';

const workflowMiddleware = require('./util/workflow.js')
const sendVerificationEmail = require('./email/verification.js')
const { testEmail } = require('./regex')

exports.verification = function verification(req, res, next) {
    if (req.user.roles.account.isVerified === 'yes') {
        return res.redirect(req.user.defaultReturnUrl());
    }

    let workflow = workflowMiddleware(req, res)

    workflow.on('renderPage', function() {
        req.app.db.models.User.findById(req.user.id, 'email').exec(function(err, user) {
            if (err) {
                return next(err);
            }

            res.redirect('/auth/account/verification')
        });
    });

    workflow.on('generateTokenOrRender', function() {
        if (req.user.roles.account.verificationToken !== '') {
            return workflow.emit('renderPage');
        }

        workflow.emit('generateToken');
    });

    workflow.on('generateToken', function() {
        var crypto = require('crypto');
        crypto.randomBytes(21, function(err, buf) {
            if (err) {
                return next(err);
            }

            var token = buf.toString('hex');
            req.app.db.models.User.encryptPassword(token, function(err, hash) {
                if (err) {
                    return next(err);
                }

                workflow.emit('patchAccount', token, hash);
            });
        });
    });

    workflow.on('patchAccount', function(token, hash) {
        var fieldsToSet = { verificationToken: hash };
        var options = { new: true };
        req.app.db.models.Account.findByIdAndUpdate(req.user.roles.account.id, fieldsToSet, options, function(err, account) {
            if (err) {
                return next(err);
            }

            sendVerificationEmail(req, res, {
                email: req.user.email,
                verificationToken: token,
                onSuccess: function() {
                    return workflow.emit('renderPage');
                },
                onError: function(err) {
                    return next(err);
                }
            });
        });
    });

    workflow.emit('generateTokenOrRender');
};

exports.resendVerification = function resendVerification(req, res, next) {
    if (req.user.roles.account.isVerified === 'yes') {
        return res.redirect(req.user.defaultReturnUrl());
    }

    let workflow = workflowMiddleware(req, res)

    workflow.on('validate', function() {
        let success, failReason;

        [ success, failReason ] = testEmail(req.body.email);
        if (!success) {
            workflow.outcome.errfor.email = failReason;
        }

        if (workflow.hasErrors()) {
            return workflow.emit('response');
        }

        workflow.emit('duplicateEmailCheck');
    });

    workflow.on('duplicateEmailCheck', function() {
        req.app.db.models.User.findOne({ email: req.body.email.toLowerCase(), _id: { $ne: req.user.id } }, function(err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (user) {
                workflow.outcome.errfor.email = 'email already taken';
                return workflow.emit('response');
            }

            workflow.emit('patchUser');
        });
    });

    workflow.on('patchUser', function() {
        var fieldsToSet = { email: req.body.email.toLowerCase() };
        var options = { new: true };
        req.app.db.models.User.findByIdAndUpdate(req.user.id, fieldsToSet, options, function(err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            workflow.user = user;
            workflow.emit('generateToken');
        });
    });

    workflow.on('generateToken', function() {
        var crypto = require('crypto');
        crypto.randomBytes(21, function(err, buf) {
            if (err) {
                return next(err);
            }

            var token = buf.toString('hex');
            req.app.db.models.User.encryptPassword(token, function(err, hash) {
                if (err) {
                    return next(err);
                }

                workflow.emit('patchAccount', token, hash);
            });
        });
    });

    workflow.on('patchAccount', function(token, hash) {
        var fieldsToSet = { verificationToken: hash };
        var options = { new: true };
        req.app.db.models.Account.findByIdAndUpdate(req.user.roles.account.id, fieldsToSet, options, function(err, account) {
            if (err) {
                return workflow.emit('exception', err);
            }

            sendVerificationEmail(req, res, {
                email: workflow.user.email,
                verificationToken: token,
                onSuccess: function() {
                    workflow.emit('response');
                },
                onError: function(err) {
                    workflow.outcome.errors.push('Error Sending: '+ err);
                    workflow.emit('response');
                }
            });
        });
    });

    workflow.emit('validate');
};


// TODO send the welcome email after verification if this is set in the options
exports.verify = function verify(req, res, next) {
    req.app.db.models.User.validatePassword(req.params.token, req.user.roles.account.verificationToken)
        .then((isValid) => {
            if (!isValid) {
                return res.redirect(req.user.defaultReturnUrl());
            }

            var fieldsToSet = { isVerified: 'yes', verificationToken: '' };
            var options = { new: true };
            req.app.db.models.Account.findByIdAndUpdate(req.user.roles.account._id, fieldsToSet, options, function(err, account) {
                if (err) {
                    return next(err);
                }

                return res.redirect(req.user.defaultReturnUrl());
            });
        })
};
