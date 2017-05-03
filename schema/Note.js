'use strict';

exports = module.exports = function(app, mongoose) {
    var noteSchema = new mongoose.Schema({
        data: { type: String, default: '' },
        // timeCreated: { type: Date, default: Date.now },
        userCreated: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String, default: '' },
            time: { type: Date, default: Date.now }
        }
    });
    app.db.model('Note', noteSchema);
    // mongoose.model('Note', noteSchema);
};
