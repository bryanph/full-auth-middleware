const passport = require('passport')

const User = require('./schema/User')

var LocalStrategy = require('passport-local').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var GithubStrategy = require('passport-github2').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

module.exports = function(app, mongoose, config) {

    // passport.use(new LocalStrategy(User.authenticate()));
    passport.use(new LocalStrategy(
        function(username, password, done) {
            var conditions = { isActive: 'yes' };
            if (username.indexOf('@') === -1) {
                conditions.username = username;
            }
            else {
                conditions.email = username.toLowerCase();
            }

            app.db.models.User.findOne(conditions, function(err, user) {
                if (err) {
                    return done(err);
                }

                if (!user) {
                    return done(null, false, { message: 'Unknown user' });
                }

                // user is registered only using social
                if (!user.password) {
                    let social = null
                    if (user.twitter) {
                        social = "twitter"
                    } 
                    else if (user.github) {
                        social = 'github'
                    }
                    else if (user.facebook) {
                        social = 'facebook'
                    }
                    else if (user.google) {
                        social = 'google'
                    }
                    return done(null, false, { message: `This email has been registered using ${social}` });
                }

                app.db.models.User.validatePassword(password, user.password)
                    .then((isValid) => {
                        if (!isValid) {
                            return done(null, false, { message: 'Invalid password' });
                        }

                        return done(null, user);
                    })
                    .catch(err => done(err));
            });
        }
    ));

    if (config.oauth.twitter.key) {
        passport.use(new TwitterStrategy({
            consumerKey: config.oauth.twitter.key,
            consumerSecret: config.oauth.twitter.secret,
            includeEmail: true,
        },
            function(token, tokenSecret, profile, done) {
                done(null, false, {
                    accessToken: token,
                    refreshToken: tokenSecret,
                    profile: profile
                })
            }));
    }

    // passport.serializeUser(function(user, done) {
    //   console.log("serializing user:", user._id)
    //   done(null, user);
    // })

    // passport.deserializeUser(function(obj, done) {

    //   app.db.models.User.findOne({oauthID: obj.oauthID}, function(error, user) {
    //     done(null, user);
    //   })

    //   console.log('called deserializeUser')
    // })

    if (config.oauth.google.key) {
        passport.use(new GoogleStrategy({
            clientID: config.oauth.google.key,
            clientSecret: config.oauth.google.secret,
            callbackURL: config.oauth.google.callbackUrl,
        },
            function(token, tokenSecret, profile, done) {
                done(null, false, {
                    accessToken: token,
                    refreshToken: tokenSecret,
                    profile: profile
                })
            }))
    }

    if (config.oauth.github.key) {
        passport.use(new GithubStrategy({
            clientID: config.oauth.github.key,
            clientSecret: config.oauth.github.secret,
            callbackURL: config.oauth.github.callbackUrl,
            scope: ['user:email'],
        },
            function(token, tokenSecret, profile, done) {
                done(null, false, {
                    accessToken: token,
                    refreshToken: tokenSecret,
                    profile: profile
                })
            }))
    }

    if (config.oauth.facebook.key) {
        passport.use(new FacebookStrategy({
            clientID: config.oauth.facebook.key,
            clientSecret: config.oauth.facebook.secret,
            callbackURL: config.oauth.facebook.callbackUrl,
            profileFields: ['id', 'displayName', 'photos', 'email']
        },
            function(token, tokenSecret, profile, done) {
                done(null, false, {
                    accessToken: token,
                    refreshToken: tokenSecret,
                    profile: profile
                })
            }))
    }

    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {
        app.db.models.User.getById(id)
            .then(user => done(null, user))
            .catch(error => done(error, null))
    });
}
