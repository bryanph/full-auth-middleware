
const path = require("path")
const fs = require("fs")
const express = require("express")
const exphbs = require("express-handlebars");
const bodyParser = require("body-parser")
const http = require("http")
const socket_io = require("socket.io")
const passportSocketIo = require("passport.socketio")
const session = require("express-session")
const cookieParser = require("cookie-parser")
const passport = require("passport")
const connect_mongo = require("connect-mongo")
const connect_redis = require("connect-redis")
const csrf = require("csurf")

const createAuthRoutes = require('./routes/auth.js')
const createAdminRoutes = require('./routes/admin.js')

const createLoadTemplate = require('./util/template').createLoadTemplate

exports.middleware = require('./middleware/authentication')
exports.setupAuthMiddleware = function(app, mongoose, config) {
    /*
     * Set middleware and locals
     * // TODO: from here, config must be initialized and stuff - 2016-08-09
     */

    config.env = process.env.NODE_ENV || "development"

    // Authentication-related models
    require('./schema/Note')(app, mongoose, config);
    require('./schema/Status')(app, mongoose, config);
    require('./schema/StatusLog')(app, mongoose, config);
    require('./schema/Category')(app, mongoose, config);

    require('./schema/User')(app, mongoose, config);
    require('./schema/Admin')(app, mongoose, config);
    require('./schema/AdminGroup')(app, mongoose, config);
    require('./schema/Account')(app, mongoose, config);
    require('./schema/LoginAttempt')(app, mongoose, config);


    // TODO: what if we want this served by nginx or something? - 2016-08-09
    app.use('/static/drywall', express.static(__dirname + '/public'))

    app.use(passport.initialize());
    app.use(passport.session());
    // app.use(csrf());

    //response locals
    app.use(function(req, res, next) {
        req.app = app
        // res.cookie('_csrfToken', req.csrfToken());

        // console.log(req.session)
        // console.log(req.csrfToken());
        // console.log(req.csrfToken());

        // req.session.csrfSecret = req.csrfToken()
        // res.locals.token = req.csrfToken()
        // res.locals.token = req.session.csrfSecret

        res.locals.user = {};
        res.locals.user.defaultReturnUrl = req.user && req.user.defaultReturnUrl();
        res.locals.user.username = req.user && req.user.username;
        next();
    });

    //global locals
    app.locals.projectName = config.projectName;
    app.locals.copyrightYear = new Date().getFullYear();
    app.locals.copyrightName = config.companyName;
    app.locals.cacheBreaker = 'br34k-01';

    // TODO: shouldn't be a global like this - 2016-08-09
    app.config = config
    app.utils = {
        loadTemplate: createLoadTemplate(app),
    }

    // passport.js authentication configuration
    require('./passport')(app, passport, config);

    return {
        authRoutes: createAuthRoutes(app, config),
        adminRoutes: createAdminRoutes(app, config),
    }

}

