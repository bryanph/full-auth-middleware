const passport = require('passport')
const createWorkflow = require('./util/new_workflow.js')
const { testUsername, testEmail, testPassword } = require('./regex');
const { startVerificationFlow } = require('./verification');

exports.getUser = function(req, res, next) {
    const id = req.session.passport.user;

    req.app.db.models.User.getById(id)
        .then((user) => res.end(JSON.stringify(user)))
}

exports.updateUser = async function(req, res) {

    function getUser(id) {
        return req.app.db.models.User.getById(id)
            .then((user) => {
                return { user }
            })
    }

    function validate(body) {
        // validate request.body
        const errfor = {};

        let success, failReason;

        // [ success, failReason ] = testUsername(req.body.username);
        // if (!success) {
        //     errfor.username = failReason;
        // }

        [ success, failReason ] = testEmail(req.body.email);
        if (!success) {
            errfor.email = failReason;
        }

        [ success, failReason ] = testPassword(req.body.password);
        if (!success) {
            errfor.password = failReason;
        }

        return {
            errfor,
            validated: {
                email: req.body.email,
                username: req.body.username,
                password: req.body.password,
            }
        }

    }

    function checkPassword(password, hash) {
        // check the password matches with the logged in user
        const errfor = {};
        return req.app.db.models.User.validatePassword(password, hash)
            .then((isValid) => {
                if (!isValid) {
                    errfor.password = "The password you entered was incorrect"
                }
                return { errfor }
            })


    }

    function checkExists(user, validated) {
        const errfor = {};

        let promises = [];
        if (validated.username && user.username !== validated.username) {
            // check the username doesn't already exist
            promises.push(req.app.db.models.User.findOne({ username: validated.username })
                .then(user => {
                    if (user) {
                        errfor.username = "A user with that username already exists, sorry!"
                    }
                })
            )
        }

        if (validated.email && user.email !== validated.email) {
            // check the email doesn't already exist
            promises.push(req.app.db.models.User.findOne({ email: validated.email })
                .then(user => {
                    if (user) {
                        errfor.email = "A user with that email already exists, sorry!"
                    }
                })
            )
        }

        return Promise.all(promises)
            .then(() => ({ errfor }))
    }

    async function updateUser(user, validated) {
        const id = req.session.passport.user;
        let shouldReverify = false;

        if (user.username !== validated.username) {
            user.username = validated.username;
        }
        if (user.email !== validated.email) {
            user.email = validated.email;

            shouldReverify = true;
        }

        const updatedUser = await user.save()

        if (shouldReverify) {
            startVerificationFlow(req, res);
        }

        return { updatedUser };
    }

    let workflow = createWorkflow(req, res)
    const id = req.session.passport.user;

    const { user } = await workflow.handle(getUser(id))
    if (workflow.hasErrors()) return workflow.sendResponse();

    const { validated } = await workflow.handle(validate(req.body))
    if (workflow.hasErrors()) return workflow.sendResponse();

    await workflow.handle(checkPassword(validated.password, user.password));
    if (workflow.hasErrors()) return workflow.sendResponse();

    await workflow.handle(checkExists(user, validated));
    if (workflow.hasErrors()) return workflow.sendResponse();

    const { updatedUser } = await workflow.handle(updateUser(user, validated));
    if (workflow.hasErrors()) return workflow.sendResponse();

    return workflow.sendResponse(updatedUser)
}

