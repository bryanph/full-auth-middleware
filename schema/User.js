'use strict';

const bcrypt = require('bcrypt')

module.exports = function(app, mongoose, config) {

    const uiStateSchema = new mongoose.Schema({
        shortcutWindow: {type: Boolean, default: true},
    });

    var userSchema = new mongoose.Schema({
        username: { type: String, unique: true },
        password: String,
        email: { type: String, unique: true },
        roles: {
            admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
            account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }
        },
        isActive: String,
        timeCreated: { type: Date, default: Date.now },
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        twitter: mongoose.Schema.Types.Mixed,
        github: mongoose.Schema.Types.Mixed,
        facebook: mongoose.Schema.Types.Mixed,
        google: mongoose.Schema.Types.Mixed,
        search: [String],
        uiState: { type: uiStateSchema, default: uiStateSchema },
        avatar: String,
        displayName: String,

        // custom
        // files: [ fileSchema ]
        files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
        rootCollectionId: String,
    });
    userSchema.methods.canPlayRoleOf = function(role) {
        if (role === "admin" && this.roles.admin) {
            return true;
        }

        if (role === "account" && this.roles.account) {
            return true;
        }

        return false;
    };
    userSchema.methods.defaultReturnUrl = function() {
        var returnUrl = '/app';

        // if (this.canPlayRoleOf('account')) {
        //   returnUrl = '/account/';
        // }

        // if (this.canPlayRoleOf('admin')) {
        //   returnUrl = '/admin/';
        // }

        return returnUrl;
    };
    userSchema.statics.encryptPassword = function(password, done) {

        bcrypt.genSalt(10, function(err, salt) {
            if (err) {
                return done(err);
            }

            bcrypt.hash(password, salt, function(err, hash) {
                done(err, hash);
            });
        });
    };
    userSchema.statics.validatePassword = function(password, hash, done) {
        bcrypt.compare(password, hash, function(err, res) {
            done(err, res);
        });
    };
    userSchema.plugin(require('./plugins/pagedFind'));
    userSchema.index({ username: 1 }, { unique: true });
    userSchema.index({ email: 1 }, { unique: true });
    userSchema.index({ timeCreated: 1 });
    userSchema.index({ 'twitter.id': 1 });
    userSchema.index({ 'github.id': 1 });
    userSchema.index({ 'facebook.id': 1 });
    userSchema.index({ 'google.id': 1 });
    userSchema.index({ search: 1 });
    userSchema.set('autoIndex', (config.env === 'development'));

    const fileSchema = new mongoose.Schema({
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        encoding: String,
        filename: String,
        mimetype: String,
        originalname: String,
        size: String,
        url: String,
    })

    app.db.model('User', userSchema);
    app.db.model('File', fileSchema);
    // mongoose.model('User', userSchema);
};
