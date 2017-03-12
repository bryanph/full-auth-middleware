const path = require('path')
const jade = require('jade')

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

            return jade.compileFile(templatePath)
        }

        const prefixPath = thisProject ? '../views/' : mainViewDir
        const templatePath = require.resolve(path.join(prefixPath, relativePath))
        return jade.compileFile(templatePath)
    }
}
