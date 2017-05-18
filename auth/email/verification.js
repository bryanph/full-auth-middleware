const sendmail = require('../util/sendmail.js')

module.exports = function sendVerificationEmail(req, res, options) {
    sendmail(req, res, {
        from: req.app.config.smtp.from.name +' <'+ req.app.config.smtp.from.address +'>',
        to: options.email,
        subject: 'Verify Your '+ req.app.config.projectName +' Account',
        textPath: 'email/verification-text.hbs',
        htmlPath: 'email/verification-html.hbs',
        locals: {
            verifyURL: req.protocol +'://'+ req.headers.host +'/auth/account/verification/' + options.verificationToken + '/',
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

