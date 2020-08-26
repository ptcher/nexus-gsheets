'use strict';

// TODO: get these from a config
var NEXUS_ADDRESS = 'localhost:7081';
var COMPONENT_PATH = 'testSpreadheet';

// TODO: make a basic UI for filling a spreadsheet and displaying it as text
// I need a text input, a submit button, 

var spreadsheets = fluid.registerNamespace('spreadsheets');

/**
 * A grade for components that contain a message in their model, 
 * which they send to their sayHello invoker every time it changes.
 */
fluid.defaults('spreadsheets.helloWorld.sayHello', {
    gradeNames: ['fluid.modelComponent'],
    model: {
        message: 'hello world',
    },
    modelListeners: {
        message: '{that}.sayHello'
    },
    invokers: {
        sayHello: 'fluid.notImplemented'
    }
});

/**
 * A version of sayHello that emits messages to the console
 */
fluid.defaults('spreadsheets.helloWorld.consoleHello', {
    gradeNames: ['spreadsheets.helloWorld.sayHello'],
    invokers: {
        sayHello: {
            'this': 'console',
            method: 'log',
            args: ['{that}.model.message']
        }
    }
});

/**
 * A version of sayHello that emits messages to a text field in the DOM.
 */
fluid.defaults('spreadsheets.helloWorld.displayHello', {
    gradeNames: ['spreadsheets.helloWorld.sayHello', 'fluid.viewComponent'],
    selectors: {
        messageArea: '.flc-messageArea'
    },
    invokers: {
        sayHello: {
            funcName: 'spreadsheets.helloWorld.displayHello.displayJSON',
            args: ['{that}.model.message', '{that}.dom.messageArea']
        }
    }
});

spreadsheets.helloWorld.displayHello.displayJSON = function (json, dom) {
    dom.html(JSON.stringify(json, null, 4));
};

/**
 * A message-containing component that relays itself to both a consoleHello and a displayHello component
 */
fluid.defaults('spreadsheets.helloWorld', {
    gradeNames: ['fluid.modelComponent'],
    model: {
        message: 'Hello world!'
    },
    listeners: {
        'onCreate.announceSelf': {
            'this': 'console',
            method: 'log',
            args: ['the helloWorld component is ready']
        }
    },
    components: {
        consoleHello: {
            type: 'spreadsheets.helloWorld.consoleHello',
            options: {
                model: {
                    message: '{helloWorld}.model.message'
                }
            }
        },
        displayHello: {
            type: 'spreadsheets.helloWorld.displayHello',
            container: '.flc-spreadsheetContainer',
            options: {
                model: {
                    message: '{helloWorld}.model.message'
                }
            }
        }
    }
});

// Currently, our hard-coded test uses a sub-component specified in code as the data source that is rendered
// We need instead for this component to be created in response to user input.
// The least infusion-y way I can see of doing this is to run a construct with template options in response to a user input. I'm not actually sure if a construct at a relative path counts as creating a sub-component.
// viewComponents are one-way, so I would need to create a change listener that updates a model somewhere. On the bright side, only the bit of the DOM that is actually going to represent model content needs to be known to the component tree.
// text field for id -> submit button -(js call)> construct a component -(viewComponent)> the component is shown in an appropriate representation
// TODO: This actually demonstrates a fault of my shadowComponent: we need to actually test that the supplied options are the same as the options of the existing component when avoiding redundant constructions. Otherwise an "overwriting construction" of a spreadsheet with a new id at the same address would do nothing and return the wrong component. In the current case, false negatives (falsely believing an existing component is not the one we want) is better than false positives. Overall replacing a component with an identical one should really not break things.
// TODO: Around that though, we should not be reusing the same path over and over again, but make the path of a sheet be dependent on its id. What does that mean for the UI routine?
var helloWorld = fluid.construct('helloWorld', {
    type: 'spreadsheets.helloWorld',
    model: {
        message: ''
    },
    modelRelay: {
        source: '{that}.shadow.model.Sheet1',
        target: 'message',
        singleTransform: {
            type: 'fluid.transforms.identity'
        },
        backward: {
            excludeSource: 'init'
        }
    },
    components: {
        shadow: {
            type: 'spreadsheets.shadowComponent',
            options: {
                nexusAddress: NEXUS_ADDRESS,
                remotePath: COMPONENT_PATH,
                remoteConstructionRecord: {
                    type: 'spreadsheets.spreadsheet',
                    spreadsheetId: '1B2769NqCW1yBlP_eT6kQ5iRBM1cbYyhB_0paDgNT6dk'
                }
            }
        }
    }
});
