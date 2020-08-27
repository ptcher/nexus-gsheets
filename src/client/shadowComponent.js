'use strict';

var fluid = fluid || require('infusion');

var spreadsheets = fluid.registerNamespace('spreadsheets');

// FIXME: changing the spreadsheetId and re-constructing a shadowComponent does not cause the sheet to be reloaded when there is already a shadowed component at the component path
// FIXME: the Nexus crashes on issuing updates to the remote
// If I can get this component working, do I need something like constructNexusPeers?
// I still need something in case another location, e.g. a sensor adapter, introduces a remote component that I want to mirror.
// But maybe it seems like that what the co-occurrence engine is for:
// I want to ask for all things of certain grade names to be fed to me in some locally meaningful way.
// Is this part of what the Nexus is supposed to do for us, that we can ask it "get me things I'm interested in in this format"?

/**
 * A component that shadows the model of a nexus component.
 * A shadowComponent's model is bidirectionally bound to the component at the remotePath on the nexus.
 * If a shadowComponent has no remote counterpart already, it is constructed.
 * 
 * Example: 
 * fluid.construct('some.local.path', {
 *     type: 'spreadsheets.shadowComponent',
 *     options: {
 *         nexusAaddress: 'localhost:7081',
 *         remotePath: 'some.remote.path'
 *         remoteConstructionRecord: {
 *             type: 'spreadsheets.spreadsheet',
 *             spreadsheetId: '...'
 *         }
 *     }
 * });
 * 
 * This component is useful in the spreadsheets project because it allows us to
 * construct components that are only available on the server.
 * In theory, it allows multiple clients of the same Nexus to share a component model,
 * but this requires them to first agree on what path that component will exist at.
 * In the more general case of "nexus-sensitive" components that may wish to discover
 * what is currently available on a Nexus, we need a discovery mechanism.
 * The co-occurrence engine may play a role here.
 * TODO: example use case of what a "nexus-sensitive" component might be?
 *       The visible Nexus is one, but that requires a full tree-shadowing endpoint.
 *       
 */
fluid.defaults('spreadsheets.shadowComponent', {
    gradeNames: ['fluid.modelComponent'],
    members: {
        ws: null // a WebSocket object, filled in the init process
    },
    nexusAddress: 'to be filled in construction options',
    remotePath: 'to be filled in construction options',
    remoteConstructionRecord: {},
    modelListeners: {
        '': {
            funcName: "spreadsheets.shadowComponent.updateRemoteModel",
            args: ['{that}.ws', '{change}.path', '{change}.value'],
            excludeSource: 'bindModel'
        }
    },
    events: {
        init: null
    },
    listeners: {
        'onCreate.startConstruction': {
            funcName: 'spreadsheets.shadowComponent.fireTransformEvent',
            args: ['{that}', 'init'] 
        },
        'init.readRemote': {
            funcName: 'spreadsheets.shadowComponent.readRemote',
            args: ['{that}.options.nexusAddress', '{that}.options.remotePath'],
            priority: 'first'
        },
        'init.constructRemote': {
            funcName: 'spreadsheets.shadowComponent.constructRemote',
            args: ['{arguments}.0', '{that}.options.nexusAddress', '{that}.options.remotePath', '{that}.options.remoteConstructionRecord'],
            priority: 'after:readRemote'
        },
        'init.bindModel': {
            funcName: 'spreadsheets.shadowComponent.bindModel',
            args: ['{that}', '{that}.options.nexusAddress', '{that}.options.remotePath'],
            priority: 'after:constructRemote'
        },
        'onDestroy.unbindModel': {
            funcName: 'spreadsheets.shadowComponent.unbindModel',
            args: ['{that}.ws']
        }
    }
});

/**
 * Fire an event in the "transforming promise chain" mode, i.e. process a pipeline of listeners ordered by Infusion's priority system, each listener returning a Promise whose resolved value will be forwarded to the next listener in the sequence.
 * @see https://docs.fluidproject.org/infusion/development/PromisesAPI.html#fluidpromisefiretransformeventevent-payload-options
 * @param {fluid.component} that The host component for the transforming promise chain.
 * @param {string} event The event to fire.
 */
spreadsheets.shadowComponent.fireTransformEvent = function (that, event) {
    fluid.promise.fireTransformEvent(that.events[event]);
};

/**
 * Wrap a Promise so that its reject will be treated as a resolve.
 * @param {Promise} promise The promise to wrap.
 * @param {any} [errorValue] An optional value for the new promise to resolve to when the wrapped promise rejects.
 * @returns {fluid.promise}
 */
spreadsheets.shadowComponent.rejectToResolve = function (promise, errorValue) {
    var togo = fluid.promise();
    promise.then(function (value) {
        togo.resolve(value);
    }, function (error) {
        togo.resolve(errorValue || error);
    });
    return togo;
};

/**
 * Attempt to read the remote counterpart to this shadowComponent will shadow. If the component already exists, the shadowComponent will avoid reconstructing it.
 * @param {string} nexusAddress The URL of the Nexus server where the shadowed component will live.
 * @param {string} remotePath The shadowed component's path on the Nexus server.
 * @returns {fluid.promise}
 */
spreadsheets.shadowComponent.readRemote = function (nexusAddress, remotePath) {
    var getPromise = $.ajax({
        url: 'http://' + nexusAddress + '/components/' + remotePath,
        type: 'GET',
        dataType: 'json',
    });
    var promiseTogo = spreadsheets.shadowComponent.rejectToResolve(getPromise);
    // FIXME: while we are unable to do a sufficiently robust check for redundant constructions,
    // we should just assume that components need to be reconstructed.
    // var promiseTogo = fluid.promise();
    // promiseTogo.then((val) => val);
    // promiseTogo.resolve({ status: 404 });
    return promiseTogo;
};

// TODO: allow remoteGradeName to be empty, in which case the component will only be constructed if the GET is succesful.
// so it sounds like there's a genuine failure case, which is that the response is successful and the type does not match
/**
 * Construct the remote counterpart to this shadowComponent.
 * @param {object} getResponse The HTTP response produced by spreadsheets.shadowComponent.readRemote. 
 * @param {string} nexusAddress The URL of the Nexus server where the shadowed component will live.
 * @param {string} remotePath The shadowed component's path on the Nexus server.
 * @param {object} remoteConstructionRecord The grade name and construction options for the shadowed component.
 * @returns {Promise}
 */
spreadsheets.shadowComponent.constructRemote = function (getResponse, nexusAddress, remotePath, remoteConstructionRecord) {
    // When getResponse is successful, it will be the comopnent shell data
    // if it's unsuccessful, it is an HTTP request error
    if (getResponse.status !== 404 && getResponse.typeName === remoteConstructionRecord.type) {
        // the remote component exists, so there is no need to construct it
        // return a pre-resolved promise to immediately push the transforming promise chain forward
        return fluid.promise().resolve();
    } else {
        // the remote component does not exist, construct it with a PUT request
        var promiseTogo = $.ajax({
            url: 'http://' + nexusAddress + '/components/' + remotePath,
            data: remoteConstructionRecord,
            type: 'PUT',
            // dataType: 'json' debug: removing this might make the response work?
        });
        // debug
        // even with the 201 response code, it is seeing it as rejected
        return promiseTogo;
    }
};

// TODO: make this bidirectional
/**
 * Establish a WebSocket bidirectionally synchronizing the shadowed component's model with this shadowComponent.
 * @param {spreadsheets.shadowComponent} that The shadowComponent.
 * @param {string} nexusAddress The URL of the Nexus server where the shadowed component will live.
 * @param {string} remotePath The shadowed component's path on the Nexus server.
 */
spreadsheets.shadowComponent.bindModel = function (that, nexusAddress, remotePath) {
    var ws = new WebSocket('ws://' + nexusAddress + '/bindModel/' + remotePath);
    that.ws = ws;

    ws.onopen = function (event) {
        ws.onmessage = function (event) {
            try {
                // apply a change to the shadowComponent's model with the source 'bindModel'
                that.applier.change('', JSON.parse(event.data).payload, 'ADD', 'bindModel');
            } catch (err) {
                // initial messages are sometimes not valid JSON
                // this maybe shouldn't happen?
                // FIXME: 
                debugger;
                return;
            }
        };
    };
};

/**
 * Forward new model values to the shadow component.
 * @param {WebSocket} ws The WebSocket connection to the shadowed component.
 * @param {object} newModel The updated component model.
 */
spreadsheets.shadowComponent.updateRemoteModel = function (ws, changePath, changeValue) {
    console.log("Updating shadowed model path " + changePath + " to " + JSON.stringify(changeValue));
    ws.send(JSON.stringify({
        path: changePath,
        value: changeValue
    }));
};

/**
 * Close the WebSocket connection to the shadow component.
 * @param {WebSocket} ws The WebSocket connection to the shadowed component.
 */
spreadsheets.shadowComponent.unbindModel = function (ws) {
    // Close WebSocket with status code for 'going away'
    ws.close(1001);
};
