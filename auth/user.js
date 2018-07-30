


const passport = require('passport')
const createWorkflow = require('./util/new_workflow.js')
const to = require('await-to-js').default;

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

        if (req.body.username) {
            if (!/^[a-zA-Z0-9]+([_ -]?[a-zA-Z0-9])*$/.test(req.body.username)) {
                errfor.username = 'invalid username format';
            }
        }

        if (req.body.email) {
            if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
                errfor.email = 'invalid email format';
            }
        }

        if (!req.body.password) {
            errfor.password = 'required';
        }

        if (Object.keys(errfor).length > 0) {
            // return error
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

    function updateUser(user, validated) {
        const id = req.session.passport.user;

        if (user.username !== validated.username) {
            user.username = validated.username;
        }
        if (user.email !== validated.email) {
            user.email = validated.email;

            console.log(user);
            // TODO: send a new verification mail if verification is enabled - 2018-07-30
        }

        return user.save()
            .then((updatedUser) => {
                // not
                return { updatedUser };
            })
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

