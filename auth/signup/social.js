const workflowMiddleware = require('../util/workflow')
const sendmail = require('../util/sendmail')
const path = require('path')
const sendVerificationEmail = require('../email/verification.js')
const submitWelcomeEmail = require('../email/welcome.js')

const errors = require('../../util/errors')

exports.signupSocial = function signupSocial(req, res, next) {

    let workflow = workflowMiddleware(req, res)

    workflow.on('validate', function() {
        if (!req.body.email) {
            workflow.outcome.errfor.email = 'required';
        }
        else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
            workflow.outcome.errfor.email = 'invalid email format';
        }

        if (workflow.hasErrors()) {
            return workflow.emit('response');
        }

        workflow.emit('duplicateUsernameCheck');
    });

    workflow.on('duplicateUsernameCheck', function() {
        workflow.username = req.session.socialProfile.username || req.session.socialProfile.id;

        if (!/^[a-zA-Z0-9\-\_]+$/.test(workflow.username)) {
            workflow.username = workflow.username.replace(/[^a-zA-Z0-9\-\_]/g, '');
        }

        req.app.db.models.User.findOne({ username: workflow.username }, function(err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (user) {
                workflow.username = workflow.username + req.session.socialProfile.id;
            }
            else {
                workflow.username = workflow.username;
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
        var avatarSocial
        if (req.session.socialProfile.provider == 'twitter') { avatarSocial = req.session.socialProfile._json.profile_image_url_https }
        else if (req.session.socialProfile.provider == 'github') { avatarSocial = req.session.socialProfile._json.avatar_url }
        else if (req.session.socialProfile.provider == 'facebook') { avatarSocial = req.session.socialProfile.photos[0].value }
        else if (req.session.socialProfile.provider == 'google') { avatarSocial = req.session.socialProfile._json.image.url }
        var displayName = req.session.socialProfile.displayName || '';
        var nameParts = displayName.split(' ');
        var fieldsToSet = {
            isActive: 'yes',
            username: workflow.username,
            email: req.body.email.toLowerCase(),
            search: [
                workflow.username,
                req.body.email
            ],
            firstName: nameParts[0],
            lastName: nameParts[1] || '',
            avatar: avatarSocial
        };
        fieldsToSet[req.session.socialProfile.provider] = { id: req.session.socialProfile.id };

        req.app.db.models.User.create(fieldsToSet, function(err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            workflow.user = user;
            workflow.emit('createAccount');
        });
    });

    workflow.on('createAccount', function() {
        var displayName = req.session.socialProfile.displayName || '';
        var nameParts = displayName.split(' ');
        var fieldsToSet = {
            isVerified: 'no',
            'name.first': nameParts[0],
            'name.last': nameParts[1] || '',
            'name.full': displayName,
            user: {
                id: workflow.user._id,
                name: workflow.user.username
            },
            search: [
                nameParts[0],
                nameParts[1] || ''
            ],
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
            username: workflow.user.username,
            email: req.body.email,
            onSuccess: function() {
                return workflow.emit('logUserIn');
            },
            onError: function(err) {
                console.log('Error Sending Welcome Email: '+ err);
                workflow.emit('logUserIn');
                // return next(err);
            }
        })
    });

    workflow.on('logUserIn', function() {
        req.login(workflow.user, function(err) {
            if (err) {
                return workflow.emit('exception', err);
            }

            delete req.session.socialProfile;
            workflow.outcome.defaultReturnUrl = workflow.user.defaultReturnUrl();
            if(req.app.config.requireAccountVerification) {
                workflow.emit('sendVerificationMail')
            } else {
                workflow.emit('response');
            }
        });
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
            req.app.db.models.Account.findByIdAndUpdate(req.user.roles.account, fieldsToSet, options, function(err, account) {
                if (err) {
                    return next(err);
                }

                sendVerificationEmail(req, res, {
                    email: req.user.email,
                    verificationToken: token,
                    onSuccess: function() {
                        return workflow.emit('response');
                    },
                    onError: function(err) {
                        return next(err);
                    }
                });
            });
        });

        workflow.emit('generateToken');
    })

    workflow.emit('validate');
};

const logUserIn = async function(req, res, user) {
    return new Promise((resolve, reject) => {
        req.login(user, function(err) {
            if (err) {
                reject(err)
            }

            res.redirect(req.app.config.appUrl);
            resolve()
        });
    })
}

const sendWelcomeEmail = async function(req, res, email, username) {
    return new Promise((resolve, reject) => {
        submitWelcomeEmail(req, res, {
            username,
            email,
            onSuccess: function() {
                resolve()
            },
            onError: function(err) {
                console.error('Error Sending Welcome Email: '+ err);
                resolve()
                // return next(err);
            }
        })
    })
}

const duplicateCheck = async function(req, email, username) {
    // TODO: handle the error properly - 2017-06-02
    console.log('called duplicateCheck');
    const user = await req.app.db.models.User.findOne({
        $or: [{ username }, { email }]
    })

    if (user) {
        return false
    }

    return true
}

const createUser = async function(req, email, username, displayName, avatar, provider, providerId) {
    console.log('called createUser');
    const fieldsToSet = {
        isActive: 'yes',
        username,
        email,
        search: [
            username,
            email,
        ],
        displayName,
        avatar,
        [provider]: { id: providerId }
    };

    const user = await req.app.db.models.User.create(fieldsToSet)
    return user
}

const createAccount = async function(req, user) {
    console.log('called createAccount');
    const fieldsToSet = {
        isVerified: 'yes',
        user: {
            id: user._id,
            name: user.username
        },
    };

    const account = await req.app.db.models.Account.create(fieldsToSet)

    return account
}

const completeSocialSignup = async function(req, res, next, email, username, displayName, avatar, provider, providerId) {
    console.log('called completeSocialSignup');
    const noDuplicate = await duplicateCheck(req, email, username)

    if (!noDuplicate) {
        return next({
            type: errors.VALIDATION_ERROR, // validation
            errFor: {
                email: `Your ${provider} email is already being used by another user.`
            }
        })
    }

    let user = await createUser(req, email, username, displayName, avatar, provider, providerId)
    const account = await createAccount(req, user)

    user.roles.account = account._id;
    user = await user.save()

    sendWelcomeEmail(req, res, email, username)
    return logUserIn(req, res, user)
}

exports.signupTwitter = function signupTwitter(req, res, next) {
    req._passport.instance.authenticate('twitter', function(err, user, info) {

        if (!info || !info.profile) {
            return next({
                type: errors.SOCIAL_AUTH_FAILED, // validation
                provider: 'twitter',
            })
        }

        req.app.db.models.User.findOne({ 'twitter.id': info.profile.id }, function(err, user) {
            if (err) {
                return next(err);
            }

            if (!user) {
                const providerId = info.profile.id
                const email = info.profile.emails && info.profile.emails[0].value
                const avatar = !info.profile._json.default_profile_image && info.profile._json.profile_image_url_https
                const displayName = info.profile.displayName
                return completeSocialSignup(req, res, next, email, email, displayName, avatar, 'twitter', providerId)
                    .catch(next)
            }
            else {
                // TODO: just redirect to the app - 2016-05-02
                return logUserIn(req, res, user)
                    .catch(next)
            }
        });
    })(req, res, next);
}

exports.signupGoogle = function signupGoogle(req, res, next) {
    req._passport.instance.authenticate('google', function(err, user, info) {
        if (!info || !info.profile) {
            return next({
                type: errors.SOCIAL_AUTH_FAILED, // validation
                provider: 'google',
            })
        }
        req.app.db.models.User.findOne({ 'google.id': info.profile.id }, function(err, user) {
            if (err) {
                return next(err);
            }
            if (!user) {
                // TODO: get email from Google - 2016-05-04

                req.session.socialProfile = info.profile;
                res.redirect(path.join(
                    '/auth/signup/social',
                    info.profile.emails && info.profile.emails[0].value || ''
                ))
            }
            else {
                req.login(user, function(err) {
                    if (err) {
                        return next(err);
                    }

                    var avatar = info.profile._json.image.url
                    req.app.db.models.User.findOneAndUpdate(
                        {_id: user._id}, 
                        {$set: {
                            avatar: avatar 
                        }}, { new: true })
                        .then(user => {
                            res.redirect(req.app.config.appUrl);
                        })
                        .catch(next)

                });
            }
        });
    })(req, res, next);
};

exports.signupGithub = function signupGithub(req, res, next) {
    req._passport.instance.authenticate('github', function(err, user, info) {
        if (!info || !info.profile) {
            return res.redirect('/auth/signup/');
        }

        req.app.db.models.User.findOne({ 'github.id': info.profile.id }, function(err, user) {
            if (err) {
                return next(err);
            }

            if (!user) {
                req.session.socialProfile = info.profile;

                res.redirect(path.join(
                    '/auth/signup/social',
                    info.profile.emails && info.profile.emails[0].value || ''
                ))
            }
            else {
                req.login(user, function(err) {
                    if (err) {
                        return next(err);
                    }

                    var avatar = info.profile._json.avatar_url
                    req.app.db.models.User.findOneAndUpdate({_id: user._id}, {$set: { avatar: avatar }}, { new: true })
                        .then(user => {
                            res.redirect(req.app.config.appUrl);
                        })
                        .catch(next)

                    res.redirect(req.app.config.appUrl);

                });
            }
        });
    })(req, res, next);
};

exports.signupFacebook = function signupFacebook(req, res, next) {
    req._passport.instance.authenticate('facebook', function(err, user, info) {
        if (!info || !info.profile) {
            return res.redirect('/auth/signup/');
        }

        req.app.db.models.User.findOne({ 'facebook.id': info.profile.id }, function(err, user) {
            if (err) {
                return next(err);
            }
            if (!user) {
                // TODO: get email from Facebook and use it - 2016-05-04
                req.session.socialProfile = info.profile;
                res.redirect(path.join(
                    '/auth/signup/social',
                    info.profile.emails && info.profile.emails[0].value || ''
                ))
            }
            else {
                req.login(user, function(err) {
                    if (err) {
                        return next(err);
                    }

                    var avatar = info.profile.photos[0].value
                    req.app.db.models.User.findOneAndUpdate({_id: user._id}, {$set: { avatar: avatar }}, { new: true })
                        .then(user => {
                            res.redirect(req.app.config.appUrl);
                        })
                        .catch(next)

                });
            }
        });
    })(req, res, next);
};
