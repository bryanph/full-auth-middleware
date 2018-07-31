
const MIN_PASSWORD_LENGTH = 6;

const usernameRegex = /^[a-zA-Z0-9]+([_ -]?[a-zA-Z0-9])*$/
const emailRegex = /^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/
const passwordLengthRegex = RegExp(`(?=.{${MIN_PASSWORD_LENGTH},})`) // minimum 8 chars

export function testUsername(username, required=true) {
    if (required && !username) {
        return [ false, "required" ];
    }
    else if (!usernameRegex.test(username)) {
        return [ false, "invalid username format" ];
    }

    return [ true, null ];
}

export function testEmail(email, { required=true }) {
    if (required && !email) {
        return [ false, "required" ];
    }
    else if (!emailRegex.test(email)) {
        return [ false, "invalid email format" ];
    }

    return [ true, null ];
}


export function testPassword(password, { required=true }) {
    if (required && !password) {
        return [ false, "required" ];
    }
    else if (!passwordLengthRegex.test(password)) {
        return [ false, `Your password must at least be ${MIN_PASSWORD_LENGTH} characters long` ];
    }

    return [ true, null ];
}

