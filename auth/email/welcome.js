const sendmail = require('../util/sendmail.js')

module.exports = function sendWelcomeEmail(req, res, options) {
    if (!req.app.config.sendWelcomeEmail) {
        return options.onSuccess();
    }

    sendmail(req, res, {
        from: req.app.config.smtp.from.name +' <'+ req.app.config.smtp.from.address +'>',
        to: options.email,
        subject: 'Your '+ req.app.config.projectName +' Account',
        textPath: 'email/signup-text.hbs',
        htmlPath: 'email/signup-html.hbs',
        locals: {
            username: options.username,
            email: options.email,
            loginURL: req.protocol +'://'+ req.headers.host +'/login/',
            projectName: req.app.config.projectName,
            supportEmail: req.app.config.supportEmail
        },
        success: function() {
            options.onSuccess();
        },
        error: function(err) {
            options.onError(err);
        }
    });
};

