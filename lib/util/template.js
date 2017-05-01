const path = require('path')
const fs = require('fs')
const handlebars = require('handlebars')

const isArray = require('lodash/isArray')
const find = require('lodash/find')

exports.createLoadTemplate = (app) => {

    const mainViewDir = app.get('views')

    return (relativePath, thisProject=true) => {
        /*
         * load template relative to views/ directory
         */


        if (isArray(mainViewDir)) {
            let templatePath = null;
            mainViewDir.some((viewDir) => {
                try {
                    const prefixPath = thisProject ? '../views/' : viewDir
                    const resolved = require.resolve(path.join(prefixPath, relativePath))
                    templatePath = resolved;
                    return true
                } catch (err) {
                    return false

                }

            })

            if (!templatePath) {
                throw new Error("template not found in view dirs")
            }

            const fileContents = fs.readFileSync(templatePath, 'utf-8')

            return handlebars.compile(fileContents)
        }

        const prefixPath = thisProject ? '../views/' : mainViewDir
        const templatePath = require.resolve(path.join(prefixPath, relativePath))

        const fileContents = fs.readFileSync(templatePath, 'utf-8')
        return handlebars.compile(fileContents)
    }
}
