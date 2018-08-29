'use strict';

const workflowMiddleware = require('./util/workflow.js')
const sendVerificationEmail = require('./email/verification.js')
const { testEmail } = require('./regex')

exports.resendVerification = function resendVerification(req, res, next) {
    /*
     * Start verification flow with a new email
    */
    if (req.user.roles.account.isVerified) {
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
            req.app.db.models.User.encryptPassword(token)
                .then((hash) => {
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
            })
                .then(() => {
                    return workflow.emit('response');
                })
                .catch(() => {
                    return next(err);
                })
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

            var fieldsToSet = { isVerified: true, verificationToken: '' };
            var options = { new: true };
            req.app.db.models.Account.findByIdAndUpdate(req.user.roles.account._id, fieldsToSet, options, function(err, account) {
                if (err) {
                    return next(err);
                }

                return res.redirect(req.user.defaultReturnUrl());
            });
        })
};

const crypto = require('crypto');

exports.startVerificationFlow = async function startVerificationFlow(req, res) {
    /*
     * creates a token, stores it as user.verificationToken and sends a verification email
    */
    const buf = crypto.randomBytes(21);
    const token = buf.toString('hex');
    const hash = await req.app.db.models.User.encryptPassword(token)

    var fieldsToSet = { isVerified: "no", verificationToken: hash };
    var options = { new: true };
    const account = await req.app.db.models.Account.findByIdAndUpdate(req.user.roles.account.id, fieldsToSet, options)

    return sendVerificationEmail(req, res, {
        email: req.user.email,
        verificationToken: token,
    });
}

