'use strict';

function to(promise) {
    // case where the argument is just a response
    if (!promise.then) {
        return Promise.resolve([ null, promise ]);
    }

    return promise.then(data => {
        return [null, data];
    })
        .catch(err => {
            return [err, {}]
        });
}

const workflow = function(req, res) {
    var workflow = new (require('events').EventEmitter)();

    workflow.outcome = {
        success: false,
        exception: null,
        errors: [],
        errfor: {},
        response: null,
    };

    workflow.skipResponse = function() {
        workflow.outcome.success = !workflow.hasErrors();
        res.send(workflow.outcome);
    }

    workflow.hasErrors = function() {
        return workflow.outcome.exception ||
            Object.keys(workflow.outcome.errfor).length !== 0 ||
            workflow.outcome.errors.length !== 0;
    };

    workflow.setException = function(error) {
        workflow.outcome.exception = 'Exception: ' + error
    }

    workflow.setError = function(error) {
        workflow.outcome.errors.push('Exception: '+ error);
    }

    workflow.setValidationErrors = function(errfor) {
        workflow.outcome.errfor = errfor;
    }

    workflow.sendResponse = function(value) {
        workflow.outcome.success = !workflow.hasErrors();
        workflow.outcome.response = value;
        res.send(workflow.outcome);
    }

    workflow.handle = async function(handleFunc) {
        const [ exception, { errfor, ...rest } ] = await to(handleFunc)
        if (exception) workflow.setException(exception);
        if (errfor) workflow.setValidationErrors(errfor);
        return rest
    }

    workflow.on('exception', function(err) {
        workflow.outcome.errors.push('Exception: '+ err);
        return workflow.emit('response');
    });

    workflow.on('response', function() {
        workflow.outcome.success = !workflow.hasErrors();
        res.send(workflow.outcome);
    });

    return workflow;
};

module.exports = workflow


