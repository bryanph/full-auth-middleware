const workflowMiddleware = require('../util/workflow')
const path = require('path')
const submitWelcomeEmail = require('../email/welcome.js')
const errors = require('../../util/errors')

const duplicateCheck = async function(req, email, username) {
    const user = await req.app.db.models.User.findOne({
        $or: [{ username }, { email }]
    })

    if (user) {
        return false
    }

    return true
}

const createUser = async function(req, email, username, displayName, avatar, provider, providerId) {
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
    const fieldsToSet = {
        isVerified: true,
        user: {
            id: user._id,
            name: user.username
        },
    };

    const account = await req.app.db.models.Account.create(fieldsToSet)

    return account
}
const sendWelcomeEmail = async function(req, res, email, username) {
    return submitWelcomeEmail(req, res, {
        username,
        email,
    })
}

const logUserIn = async function(req, res, user) {
    return new Promise((resolve, reject) => {
        req.login(user, function(err) {
            if (err) {
                reject(err)
            }

            res.redirect(req.session.redirectUrl || req.app.config.appUrl);
            resolve()
        });
    })
}

const completeSocialSignup = async function(req, res, next, email, username, displayName, avatar, provider, providerId) {
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

    if (req.app.config.sendWelcomeEmail) {
        sendWelcomeEmail(req, res, email, username)
    }

    const onSignupPromise = req.app.config.onSignup ? req.app.config.onSignup(user, account) : Promise.resolve()

    return onSignupPromise
        .then(() => logUserIn(req, res, user))
}

exports.signupTwitter = function signupTwitter(req, res, next) {
    req._passport.instance.authenticate('twitter', function(err, user, info) {

        if (!info || !info.profile) {
            return next({
                type: errors.SOCIAL_AUTH_FAILED, // validation
                provider: 'twitter',
                error: err,
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
                error: err,
            })
        }

        req.app.db.models.User.findOne({ 'google.id': info.profile.id }, function(err, user) {
            if (err) {
                return next(err);
            }
            if (!user) {
                const providerId = info.profile.id
                const email = info.profile.emails && info.profile.emails[0].value
                const avatar = !info.profile._json.image.isDefault && info.profile._json.image.url
                const displayName = info.profile.displayName
                return completeSocialSignup(req, res, next, email, email, displayName, avatar, 'google', providerId)
                    .catch(next)
            }
            else {
                return logUserIn(req, res, user)
                    .catch(next)
            }
        });
    })(req, res, next);
};

exports.signupGithub = function signupGithub(req, res, next) {
    req._passport.instance.authenticate('github', function(err, user, info) {
        if (!info || !info.profile) {
            return next({
                type: errors.SOCIAL_AUTH_FAILED, // validation
                provider: 'github',
                error: err,
            })
        }


        req.app.db.models.User.findOne({ 'github.id': info.profile.id }, function(err, user) {
            if (err) {
                return next(err);
            }

            if (!user) {
                const providerId = info.profile.id
                const email = info.profile.emails && info.profile.emails[0].value
                const avatar = info.profile._json.avatar_url
                const displayName = info.profile.displayName
                return completeSocialSignup(req, res, next, email, email, displayName, avatar, 'github', providerId)
                    .catch(next)
            }
            else {
                return logUserIn(req, res, user)
                    .catch(next)
            }
        });
    })(req, res, next);
};

exports.signupFacebook = function signupFacebook(req, res, next) {
    req._passport.instance.authenticate('facebook', function(err, user, info) {
        if (!info || !info.profile) {
            return next({
                type: errors.SOCIAL_AUTH_FAILED, // validation
                provider: 'facebook',
                error: err,
            })
        }

        req.app.db.models.User.findOne({ 'facebook.id': info.profile.id }, function(err, user) {
            if (err) {
                return next(err);
            }
            if (!user) {
                const providerId = info.profile.id
                const email = info.profile.emails && info.profile.emails[0].value
                const avatar = !info.profile._json.picture.data.is_silhouette && info.profile._json.picture.data.url
                const displayName = info.profile.displayName
                return completeSocialSignup(req, res, next, email, email, displayName, avatar, 'facebook', providerId)
                    .catch(next)
            }
            else {
                return logUserIn(req, res, user)
                    .catch(next)
            }
        });
    })(req, res, next);
};
