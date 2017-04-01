const express = require('express')
const passport = require('passport')

const signup = require('../auth/signup').signup
const { signupSocial, signupTwitter, signupGoogle, signupGithub, signupFacebook } = require('../auth/signup/social')

const login = require('../auth/login').login
const reset = require('../auth/reset.js')
const forgot = require('../auth/forgot')
const logout = require('../auth/logout')

const { verify, resendVerification } = require('../auth/verification')
const { authFlow, verificationFlow } = require('../middleware/authentication')

module.exports = function(app, config) {

    let router = express.Router();

    router.post('/login/', login);
    router.post('/login/forgot/', forgot);
    router.put('/login/reset/:email/:token/', reset);

    router.get('/logout/', logout);

    // TODO: generate token on signup - 2016-05-06
    router.post('/signup/', signup);

    // TODO: Merge login and signup for social auth - 2016-04-28
    router.post('/signup/social/', signupSocial);
    router.get('/signup/twitter/', 
               passport.authenticate('twitter', {
                   callbackURL:  "/auth/signup/twitter/callback",
               }));
    router.get('/signup/twitter/callback/', signupTwitter);
    router.get('/signup/github/', 
               passport.authenticate('github', {
                   callbackURL:  "/auth/signup/github/callback",
                   scope: ['user:email'],
               }));
    router.get('/signup/github/callback/', signupGithub);
    router.get('/signup/google/', 
               passport.authenticate('google', {
                   callbackURL:  "/auth/signup/google/callback/",
                   scope: ['profile', 'email'] 
               }));
    router.get('/signup/google/callback/', signupGoogle);
    router.get('/signup/facebook/', 
               passport.authenticate('facebook', {
                   callbackURL: "/auth/signup/facebook/callback/",
                   scope: ['email','public_profile'],
               }));
    router.get('/signup/facebook/callback/', signupFacebook);

    /*
     * Account verification
    */

    // Routes for the SPA
    // Just send responses instead of redirecting? and let client decide where to route to?

    const bundleFileName = config.bundleFileName ? config.bundleFileName : 'auth.bundle.js'

    const authTemplate = config.authTemplate ? 
        app.utils.loadTemplate(config.authTemplate, false) 
            : app.utils.loadTemplate('auth.jade', true)

    function authView(req, res, next) {
        // TODO: rendering a custom auth view? how? - 2016-08-09
        // TODO: custom template here - 2016-08-09

        res.write(authTemplate({
            port: process.env.NODE_ENV === 'development' ? ':3001' : '',
            fileName: bundleFileName,
            protocol: process.env.NODE_ENV === 'development' ? 'http' : 'https',
            host: req.headers.host.split(":")[0],
            INITIAL_STATE: {
                projectName: req.app.config.projectName,
                version: req.app.config.version,
                oauthMessage: '',
                oauthTwitter: !!req.app.config.oauth.twitter.key,
                oauthGitHub: !!req.app.config.oauth.github.key,
                oauthFacebook: !!req.app.config.oauth.facebook.key,
                oauthGoogle: !!req.app.config.oauth.google.key,
                oauthTumblr: !!req.app.config.oauth.tumblr.key
            }
        }))
        res.end()
    }

    // router.get('/account/verification/', verification);
    router.get('/account/verification/', verificationFlow, authView);
    router.post('/account/verification/', resendVerification);
    router.get('/account/verification/:token/', verify);

    router.get('/*', authFlow, authView);

    return router
}

