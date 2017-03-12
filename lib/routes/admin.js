
const express = require('express')
const passport = require('passport')

const signup = require('../auth/signup')
const { signupSocial, signupTwitter, signupGoogle, signupGithub } = require('../auth/signup/social')

const login = require('../auth/login').login
const reset = require('../auth/reset.js')
const forgot = require('../auth/forgot')
const logout = require('../auth/logout')

const { verify, resendVerification } = require('../auth/verification')
const { isVerified, ensureAuthenticated, ensureAccount, ensureAdmin } = require('../middleware/authentication')

module.exports = function(app, config) {

    let router = express.Router();

    //admin
    router.all('*', ensureAuthenticated);
    router.all('*', ensureAdmin);
    router.get('/', require('../views/admin/index').init);

    //admin > users
    router.get('/users/', require('../views/admin/users/index').find);
    router.post('/users/', require('../views/admin/users/index').create);
    router.get('/users/:id/', require('../views/admin/users/index').read);
    router.put('/users/:id/', require('../views/admin/users/index').update);
    router.put('/users/:id/password/', require('../views/admin/users/index').password);
    router.put('/users/:id/role-admin/', require('../views/admin/users/index').linkAdmin);
    router.delete('/users/:id/role-admin/', require('../views/admin/users/index').unlinkAdmin);
    router.put('/users/:id/role-account/', require('../views/admin/users/index').linkAccount);
    router.delete('/users/:id/role-account/', require('../views/admin/users/index').unlinkAccount);
    router.delete('/users/:id/', require('../views/admin/users/index').delete);

    //admin > administrators
    router.get('/administrators/', require('../views/admin/administrators/index').find);
    router.post('/administrators/', require('../views/admin/administrators/index').create);
    router.get('/administrators/:id/', require('../views/admin/administrators/index').read);
    router.put('/administrators/:id/', require('../views/admin/administrators/index').update);
    router.put('/administrators/:id/permissions/', require('../views/admin/administrators/index').permissions);
    router.put('/administrators/:id/groups/', require('../views/admin/administrators/index').groups);
    router.put('/administrators/:id/user/', require('../views/admin/administrators/index').linkUser);
    router.delete('/administrators/:id/user/', require('../views/admin/administrators/index').unlinkUser);
    router.delete('/administrators/:id/', require('../views/admin/administrators/index').delete);

    //admin > admin groups
    router.get('/admin-groups/', require('../views/admin/admin-groups/index').find);
    router.post('/admin-groups/', require('../views/admin/admin-groups/index').create);
    router.get('/admin-groups/:id/', require('../views/admin/admin-groups/index').read);
    router.put('/admin-groups/:id/', require('../views/admin/admin-groups/index').update);
    router.put('/admin-groups/:id/permissions/', require('../views/admin/admin-groups/index').permissions);
    router.delete('/admin-groups/:id/', require('../views/admin/admin-groups/index').delete);

    //admin > accounts
    router.get('/accounts/', require('../views/admin/accounts/index').find);
    router.post('/accounts/', require('../views/admin/accounts/index').create);
    router.get('/accounts/:id/', require('../views/admin/accounts/index').read);
    router.put('/accounts/:id/', require('../views/admin/accounts/index').update);
    router.put('/accounts/:id/user/', require('../views/admin/accounts/index').linkUser);
    router.delete('/accounts/:id/user/', require('../views/admin/accounts/index').unlinkUser);
    router.post('/accounts/:id/notes/', require('../views/admin/accounts/index').newNote);
    router.post('/accounts/:id/status/', require('../views/admin/accounts/index').newStatus);
    router.delete('/accounts/:id/', require('../views/admin/accounts/index').delete);

    //admin > statuses
    router.get('/statuses/', require('../views/admin/statuses/index').find);
    router.post('/statuses/', require('../views/admin/statuses/index').create);
    router.get('/statuses/:id/', require('../views/admin/statuses/index').read);
    router.put('/statuses/:id/', require('../views/admin/statuses/index').update);
    router.delete('/statuses/:id/', require('../views/admin/statuses/index').delete);

    //admin > categories
    router.get('/categories/', require('../views/admin/categories/index').find);
    router.post('/categories/', require('../views/admin/categories/index').create);
    router.get('/categories/:id/', require('../views/admin/categories/index').read);
    router.put('/categories/:id/', require('../views/admin/categories/index').update);
    router.delete('/categories/:id/', require('../views/admin/categories/index').delete);

    //admin > search
    router.get('/search/', require('../views/admin/search/index').find);

    return router
}
