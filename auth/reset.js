

const workflowMiddleware = require('./util/workflow.js')

module.exports = function(req, res){

    let workflow = workflowMiddleware(req, res)

    workflow.on('validate', function() {
        if (!req.body.password) {
            workflow.outcome.errfor.password = 'required';
        }

        if (!req.body.confirm) {
            workflow.outcome.errfor.confirm = 'required';
        }

        if (req.body.password !== req.body.confirm) {
            workflow.outcome.errors.push('Passwords do not match.');
        }

        if (workflow.hasErrors()) {
            return workflow.emit('response');
        }

        workflow.emit('findUser');
    });

    workflow.on('findUser', function() {
        var conditions = {
            email: req.params.email,
            resetPasswordExpires: { $gt: Date.now() }
        };
        req.app.db.models.User.findOne(conditions, function(err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (!user) {
                workflow.outcome.errors.push('Invalid request.');
                return workflow.emit('response');
            }

            req.app.db.models.User.validatePassword(req.params.token, user.resetPasswordToken)
                .then((isValid) => {
                    if (!isValid) {
                        workflow.outcome.errors.push('Invalid request.');
                        return workflow.emit('response');
                    }

                    workflow.emit('patchUser', user);
                })
                .catch(err => workflow.emit('exception', err))
        });
    });

    workflow.on('patchUser', function(user) {
        req.app.db.models.User.encryptPassword(req.body.password)
            .then((hash) => {
                var fieldsToSet = { password: hash, resetPasswordToken: '' };
                var options = { new: true };
                req.app.db.models.User.findByIdAndUpdate(user._id, fieldsToSet, options, function(err, user) {
                    if (err) {
                        return workflow.emit('exception', err);
                    }

                    workflow.emit('response');
                });
            });
    });

    workflow.emit('validate');
}
