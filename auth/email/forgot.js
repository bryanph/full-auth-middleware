const sendmail = require('../util/sendmail.js')

module.exports = function sendForgotEmail(req, res, options) {
    sendmail(req, res, {
        from: req.app.config.smtp.from.name +' <'+ req.app.config.smtp.from.address +'>',
        to: options.email,
        subject: 'Reset your '+ req.app.config.projectName +' password',
        textPath: 'email/forgot-text.hbs',
        htmlPath: 'email/forgot-html.hbs',
        locals: {
            username: options.username,
            resetLink: req.protocol +'://'+ req.headers.host +'/auth/login/reset/'+ options.email +'/'+ options.token +'/',
            projectName: req.app.config.projectName
        },
        success: function() {
            options.onSuccess();
        },
        error: function(err) {
            options.onError(err);
        }
    });
};

