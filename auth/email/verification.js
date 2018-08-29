const sendmail = require('../util/sendmail.js')

module.exports = function sendVerificationEmail(req, res, options) {
    return sendmail(req, res, {
        from: req.app.config.smtp.from.name +' <'+ req.app.config.smtp.from.address +'>',
        to: options.email,
        subject: 'Verify your '+ req.app.config.projectName +' account',
        textPath: 'email/verification-text.hbs',
        // htmlPath: 'email/verification-html.hbs',
        locals: {
            verifyURL: req.protocol +'://'+ req.headers.host +'/auth/account/verification/' + options.verificationToken + '/',
            projectName: req.app.config.projectName
        },
    });
};

