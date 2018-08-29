'use strict';

exports = module.exports = function(app, mongoose, config) {
    var accountSchema = new mongoose.Schema({
        // TODO: just store the id - 2017-06-02
        user: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String, default: '' }
        },

        // TODO: move to User model - 2017-06-02
        isVerified: { type: Boolean, default: false },
        verificationToken: { type: String, default: '' },

        // TODO: not using this - 2017-06-02
        status: {
            id: { type: String, ref: 'Status' },
            name: { type: String, default: '' },
            // TODO: just store the created date - 2017-06-02
            userCreated: {
                id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                name: { type: String, default: '' },
                time: { type: Date, default: Date.now }
            }
        },
        statusLog: [mongoose.modelSchemas.StatusLog],
        notes: [mongoose.modelSchemas.Note],

        // TODO: just store the created date - 2017-06-02
        userCreated: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String, default: '' },
            time: { type: Date, default: Date.now }
        },

        // TODO: create search indexes implicitly - 2017-06-02
        search: [String]
    });
    accountSchema.plugin(require('./plugins/pagedFind'));
    accountSchema.index({ user: 1 });
    accountSchema.index({ 'status.id': 1 });
    accountSchema.index({ search: 1 });
    accountSchema.set('autoIndex', (config.env === 'development'));
    app.db.model('Account', accountSchema);
    // mongoose.model('Account', accountSchema);
};
