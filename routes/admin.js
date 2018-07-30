const express = require('express')
const passport = require('passport')

const { ensureAuthenticated, ensureAdmin } = require('../middleware/authentication')

module.exports = function(app, config) {

    let router = express.Router();

    //admin
    router.all('*', ensureAuthenticated);
    router.all('*', ensureAdmin);

    //admin > users
    // TODO: users/my is missing - 2017-05-01
    router.get('/users/', require('../api/users').find);
    router.post('/users/', require('../api/users').create);
    router.get('/users/:id/', require('../api/users').read);
    router.put('/users/:id/', require('../api/users').update);
    router.put('/users/:id/password/', require('../api/users').password);
    router.delete('/users/:id/', require('../api/users').delete);

    // TODO: these are not used it seems - 2017-05-01
    router.put('/users/:id/role-admin/', require('../api/users').linkAdmin);
    router.delete('/users/:id/role-admin/', require('../api/users').unlinkAdmin);
    router.put('/users/:id/role-account/', require('../api/users').linkAccount);
    router.delete('/users/:id/role-account/', require('../api/users').unlinkAccount);

    //admin > admins
    router.get('/admins/', require('../api/admins').find);
    router.post('/admins/', require('../api/admins').create);
    router.get('/admins/:id/', require('../api/admins').read);
    router.put('/admins/:id/', require('../api/admins').update);
    router.put('/admins/:id/permissions/', require('../api/admins').permissions);
    router.put('/admins/:id/groups/', require('../api/admins').groups);
    router.put('/admins/:id/user/', require('../api/admins').linkUser);
    router.delete('/admins/:id/user/', require('../api/admins').unlinkUser);
    router.delete('/admins/:id/', require('../api/admins').delete);

    //admin > admin groups
    router.get('/admin-groups/', require('../api/admin-groups').find);
    router.post('/admin-groups/', require('../api/admin-groups').create);
    router.get('/admin-groups/:id/', require('../api/admin-groups').read);
    router.put('/admin-groups/:id/', require('../api/admin-groups').update);
    router.put('/admin-groups/:id/permissions/', require('../api/admin-groups').permissions);
    router.delete('/admin-groups/:id/', require('../api/admin-groups').delete);

    //admin > accounts
    // TODO: accounts/my missing - 2017-05-01
    router.get('/accounts/', require('../api/accounts').find);
    router.post('/accounts/', require('../api/accounts').create);
    router.get('/accounts/:id/', require('../api/accounts').read);
    router.put('/accounts/:id/', require('../api/accounts').update);
    router.put('/accounts/:id/user/', require('../api/accounts').linkUser);
    router.delete('/accounts/:id/user/', require('../api/accounts').unlinkUser);
    router.post('/accounts/:id/notes/', require('../api/accounts').newNote);
    router.post('/accounts/:id/status/', require('../api/accounts').newStatus);
    router.delete('/accounts/:id/', require('../api/accounts').delete);

    //admin > statuses
    router.get('/statuses/', require('../api/statuses').find);
    router.post('/statuses/', require('../api/statuses').create);
    router.get('/statuses/:id/', require('../api/statuses').read);
    router.put('/statuses/:id/', require('../api/statuses').update);
    router.delete('/statuses/:id/', require('../api/statuses').delete);

    //admin > categories
    // TODO: seem to have been removed - 2017-05-01
    // router.get('/categories/', require('../api/categories').find);
    // router.post('/categories/', require('../api/categories').create);
    // router.get('/categories/:id/', require('../api/categories').read);
    // router.put('/categories/:id/', require('../api/categories').update);
    // router.delete('/categories/:id/', require('../api/categories').delete);

    //admin > search
    // TODO: seem to have been removed - 2017-05-01
    // router.get('/search/', require('../api/search').find);

    const bundleFileName = config.bundleFileName ? config.bundleFileName : 'admin.bundle.js'

    const adminTemplate = config.adminTemplate ? 
        app.utils.loadTemplate(config.adminTemplate, false) 
            : app.utils.loadTemplate('admin.hbs', true)

    function adminView(req, res, next) {
        // TODO: rendering a custom auth view? how? - 2016-08-09
        // TODO: custom template here - 2016-08-09

        res.write(adminTemplate({
            INITIAL_STATE: JSON.stringify({
                projectName: req.app.config.projectName,
                version: req.app.config.version,
                oauthMessage: '',
                oauthTwitter: !!req.app.config.oauth.twitter.key,
                oauthGitHub: !!req.app.config.oauth.github.key,
                oauthFacebook: !!req.app.config.oauth.facebook.key,
                oauthGoogle: !!req.app.config.oauth.google.key,
            }),
        }))
        res.end()
    }

    router.get('/*', adminView);

    return router
}
