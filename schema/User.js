'use strict';

const bcrypt = require('bcrypt')

module.exports = function(app, mongoose, config) {

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
        avatar: String,
        displayName: String,
    }, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    });

    config.models && config.models.user(userSchema)

    userSchema.statics.getById = function(id) {
        return this
            // .findOne({ _id: id }, { password: 0 })
            .findOne({ _id: id })
            .populate('roles.admin')
            .populate('roles.account')
            .populate('files') // TODO: should be done in user code - 2018-08-30
            .then(function(user) {
                if (user && user.roles && user.roles.admin) {

                    return user;
                    // user.roles.admin.populate("groups", function(err, admin) {
                    //     // TODO: must be admin here? - 2016-08-11
                    //     return user
                    // });
                }
                else {
                    return user;
                }
            });
    }

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
    userSchema.statics.encryptPassword = function(password) {
        return bcrypt.genSalt(10)
            .then((salt) => bcrypt.hash(password, salt))
    };
    userSchema.statics.validatePassword = function(password, hash) {
        return bcrypt.compare(password, hash)
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

    app.db.model('User', userSchema);
};
