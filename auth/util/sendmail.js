'use strict';

const emailjs = require('emailjs/email');
const async = require('async');

exports = module.exports = function(req, res, options) {
    /* options = {
       from: String,
       to: String,
       cc: String,
       bcc: String,
       text: String,
       textPath String,
       html: String,
       htmlPath: String,
       attachments: [String],
       success: Function,
       error: Function
       } */

    return new Promise((resolve, reject) => {

        if (!options.textPath && !options.htmlPath) {
            console.error('textPath and htmlPath must be specified');
            return;
        }

        const textTemplate = req.app.utils.loadTemplate(options.textPath)
        const htmlTemplate = req.app.utils.loadTemplate(options.htmlPath)

        var renderText = function(callback) {
            const text = textTemplate(options.locals)
            options.text = text

            return callback(null, 'done')
        };

        var renderHtml = function(callback) {
            const html = htmlTemplate(options.locals)
            options.html = html

            return callback(null, 'done')
        };

        var renderers = [];
        if (options.textPath) {
            renderers.push(renderText);
        }

        if (options.htmlPath) {
            renderers.push(renderHtml);
        }

        async.parallel(
            renderers,
            function(err, results){
                if (err) {
                    return reject('Email template render failed. '+ err);
                }

                var attachments = [];

                if (options.html) {
                    attachments.push({ data: options.html, alternative: true });
                }

                if (options.attachments) {
                    for (var i = 0 ; i < options.attachments.length ; i++) {
                        attachments.push(options.attachments[i]);
                    }
                }

                var emailer = emailjs.server.connect( req.app.config.smtp.credentials );
                emailer.send({
                    from: options.from,
                    to: options.to,
                    'reply-to': options.replyTo || options.from,
                    cc: options.cc,
                    bcc: options.bcc,
                    subject: options.subject,
                    text: options.text,
                    attachment: attachments
                }, function(err, message) {
                    if (err) {
                        return reject('Email failed to send. '+ err);
                    }
                    else {
                        return resolve(message);
                    }
                });
            }
        );

    })
};
