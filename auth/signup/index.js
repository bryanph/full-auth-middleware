

const workflowMiddleware = require('../util/workflow.js')
const sendVerificationEmail = require('../email/verification.js')
const sendWelcomeEmail = require('../email/welcome.js')

exports.signupView = function signupView(req, res) {
    if (req.isAuthenticated()) {
        res.redirect(req.user.defaultReturnUrl());
    }
    else {
        let template = req.app.utils.loadTemplate('signup/index.hbs')
        res.write(template({
            INITIAL_STATE: {
                oauthMessage: '',
                oauthTwitter: !!req.app.config.oauth.twitter.key,
                oauthGitHub: !!req.app.config.oauth.github.key,
                oauthFacebook: !!req.app.config.oauth.facebook.key,
                oauthGoogle: !!req.app.config.oauth.google.key,
            }
        }))
        res.end()
    }
}

const { testUsername, testEmail, testPassword } = require('../regex')

exports.signup = function signup(req, res, next) {

    let workflow = workflowMiddleware(req, res)

    workflow.on('validate', function() {

        console.log(req.body)

        let success, failReason;

        // [ success, failReason ] = testUsername(req.body.username);
        // if (!success) {
        //     workflow.outcome.errfor.username = failReason;
        // }

        [ success, failReason ] = testEmail(req.body.email);
        if (!success) {
            workflow.outcome.errfor.email = failReason;
        }

        [ success, failReason ] = testPassword(req.body.password);
        if (!success) {
            workflow.outcome.errfor.password = failReason;
        }

        if (workflow.hasErrors()) {
            return workflow.emit('response');
        }

        workflow.emit('duplicateEmailCheck');
    });

    workflow.on('duplicateUsernameCheck', function() {
        req.app.db.models.User.findOne({ username: req.body.username }, function(err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (user) {
                workflow.outcome.errfor.username = 'username already taken';
                return workflow.emit('response');
            }

            workflow.emit('duplicateEmailCheck');
        });
    });

    workflow.on('duplicateEmailCheck', function() {
        req.app.db.models.User.findOne({ email: req.body.email.toLowerCase() }, function(err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (user) {
                workflow.outcome.errfor.email = 'email already registered';
                return workflow.emit('response');
            }

            workflow.emit('createUser');
        });
    });

    workflow.on('createUser', function() {
        req.app.db.models.User.encryptPassword(req.body.password)
            .then((hash) => {

                var fieldsToSet = {
                    isActive: 'yes',
                    username: req.body.username,
                    email: req.body.email.toLowerCase(),
                    password: hash,
                    search: [
                        req.body.username,
                        req.body.email
                    ]
                };

                req.app.db.models.User.create(fieldsToSet, function(err, user) {
                    if (err) {
                        return workflow.emit('exception', err);
                    }

                    workflow.user = user;
                    workflow.emit('createAccount');
                });
            });
    });

    workflow.on('createAccount', function() {
        var fieldsToSet = {
            isVerified: false,
            'name.full': workflow.user.username,
            user: {
                id: workflow.user._id,
                name: workflow.user.username
            },
            search: [
                workflow.user.username
            ]
        };

        req.app.db.models.Account.create(fieldsToSet, function(err, account) {
            if (err) {
                return workflow.emit('exception', err);
            }

            //update user with account
            workflow.user.roles.account = account._id;
            workflow.user.save(function(err, user) {
                if (err) {
                    return workflow.emit('exception', err);
                }

                workflow.emit('sendWelcomeEmail');
            });
        });
    });

    workflow.on('sendWelcomeEmail', function() {
        sendWelcomeEmail(req, res, {
            username: req.body.username,
            email: req.body.email,
        })
            .then(() => {
                return workflow.emit('logUserIn');
            })
            .catch(() => {
                console.error('Error Sending Welcome Email: '+ err);
                workflow.emit('logUserIn');
            })
    });

    workflow.on('logUserIn', function() {
        req._passport.instance.authenticate('local', function(err, user, info) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (!user) {
                workflow.outcome.errors.push('Login failed. That is strange.');
                return workflow.emit('response');
            }
            else {
                req.login(user, function(err) {
                    if (err) {
                        return workflow.emit('exception', err);
                    }

                    workflow.outcome.defaultReturnUrl = user.defaultReturnUrl();

                    const onSignupPromise = req.app.config.onSignup ? req.app.config.onSignup(req.user) : Promise.resolve()
                    onSignupPromise.then(() => {
                        if(req.app.config.requireAccountVerification) {
                            workflow.emit('sendVerificationMail')
                        } else {
                            workflow.emit('response');
                        }
                    })
                });
            }
        })(req, res);
    });

    // TODO: Reuse existing verification code - 2016-05-06
    workflow.on('sendVerificationMail', function() {

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
            req.app.db.models.Account.findByIdAndUpdate(req.user.roles.account, fieldsToSet, options, function(err, account) {
                if (err) {
                    return next(err);
                }

                sendVerificationEmail(req, res, {
                    email: req.user.email,
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

        workflow.emit('generateToken');
    })

    workflow.emit('validate');
};

