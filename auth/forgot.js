const workflowMiddleware = require('./util/workflow.js')
const sendmail = require('./util/sendmail.js')
const sendForgotEmail = require('./email/forgot.js')

module.exports = function(req, res, next){
    let workflow = workflowMiddleware(req, res)

    workflow.on('validate', function() {
        if (!req.body.email) {
            workflow.outcome.errfor.email = 'required';
            return workflow.emit('response');
        }

        workflow.emit('generateToken');
    });

    workflow.on('generateToken', function() {
        var crypto = require('crypto');
        crypto.randomBytes(21, function(err, buf) {
            if (err) {
                return next(err);
            }

            var token = buf.toString('hex');
            req.app.db.models.User.encryptPassword(token, function(err, hash) {
                if (err) {
                    return next(err);
                }

                workflow.emit('patchUser', token, hash);
            });
        });
    });

    workflow.on('patchUser', function(token, hash) {
        var conditions = { email: req.body.email.toLowerCase() };
        var fieldsToSet = {
            resetPasswordToken: hash,
            resetPasswordExpires: Date.now() + 10000000
        };
        req.app.db.models.User.findOneAndUpdate(conditions, fieldsToSet, function(err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (!user) {
                return workflow.emit('response');
            }

            workflow.emit('sendEmail', token, user);
        });
    });

    workflow.on('sendEmail', function(token, user) {
        sendForgotEmail(req, res, {
            username: user.username,
            email: user.email,
            token: token,
            onSuccess: function() {
                return workflow.emit('response');
            },
            onError: function(err) {
                return next(err);
            }
        });
    });

    workflow.emit('validate');
}
