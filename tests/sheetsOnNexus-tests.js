/* eslint-env node */

'use strict';

var fluid = require('infusion'),
    kettle = require('kettle');

require('../src/server/test/sheetsAPIClientMock');
require('../src/server/test/testUtils');

kettle.loadTestingSupport();

fluid.registerNamespace('fluid.tests.sheetsOnNexus');

// test request grades, used to perform basic Nexus API actions
fluid.defaults("fluid.tests.sheetsOnNexus.getDefaults", {
    gradeNames: "kettle.test.request.http",
    path: "/defaults/%gradeName",
    port: "{configuration}.options.serverPort",
    method: "GET",
    termMap: {
        gradeName: "" // to be filled by test instances
    }
});

fluid.defaults("fluid.tests.sheetsOnNexus.readComponent", {
    gradeNames: "kettle.test.request.http",
    path: "/components/%componentPath",
    port: "{configuration}.options.serverPort",
    method: "GET",
    termMap: {
        componentPath: "to be filled by test instances"
    }
});

fluid.defaults("fluid.tests.sheetsOnNexus.constructComponent", {
    gradeNames: "kettle.test.request.http",
    path: "/components/%componentPath",
    port: "{configuration}.options.serverPort",
    method: "PUT",
    termMap: {
        componentPath: "to be filled by test instances"
    }
});

fluid.defaults("fluid.tests.sheetsOnNexus.bindModel", {
    gradeNames: "kettle.test.request.ws",
    path: "/bindModel/%componentPath/%modelPath",
    port: "{configuration}.options.serverPort",
    termMap: {
        componentPath: "to be filled by test instances",
        modelPath: "to be filled by test instances"
    }
});

fluid.defaults("fluid.tests.sheetsOnNexus.destroyComponent", {
    gradeNames: "kettle.test.request.http",
    path: "/components/%componentPath",
    port: "{configuration}.options.serverPort",
    method: "DELETE",
    termMap: {
        componentPath: "to be filled by test instances"
    }
});

fluid.tests.sheetsOnNexus.testDefs = [
    {
        name: "Operating spreadsheets through the Nexus",
        gradeNames: "kettle.test.testCaseHolder",
        expect: 5,
        config: {
            configPath: "./src/server/configs",
            configName: "nexusWithSpreadsheets.config"
        },
        // make all instantiated spreadsheets use the mocked apiClient
        distributeOptions: {
            mockAPIClient: {
                target: '{that spreadsheet}.options.components.apiClient.type',
                record: 'fluid.test.spreadsheets.sheetsAPIClientMock'
            }
        },
        // name and instantiate any request/ws components used by the tests
        components: {
            getSpreadsheetDefaultsRequest: {
                type: "fluid.tests.sheetsOnNexus.getDefaults",
                options: {
                    termMap: {
                        gradeName: "spreadsheets.spreadsheet"
                    }
                }
            },
            readComponentRequest: {
                type: "fluid.tests.sheetsOnNexus.readComponent",
                options: {
                    termMap: {
                        componentPath: "firstSpreadsheet"
                    }
                }
            },
            constructSpreadsheetRequest: {
                type: "fluid.tests.sheetsOnNexus.constructComponent",
                options: {
                    termMap: {
                        componentPath: "firstSpreadsheet"
                    }
                }
            },
            destroySpreadsheetRequest: {
                type: "fluid.tests.sheetsOnNexus.destroyComponent",
                options: {
                    termMap: {
                        componentPath: "firstSpreadsheet"
                    }
                }
            },
            bindModelClient: {
                type: "fluid.tests.sheetsOnNexus.bindModel",
                options: {
                    termMap: {
                        componentPath: "firstSpreadsheet",
                        modelPath: "sheet1"
                    }
                }
            },
            bindModelComponentClient: {
                type: "fluid.tests.sheetsOnNexus.bindModel",
                options: {
                    termMap: {
                        componentPath: "debugPath1",
                        modelPath: "value"
                    }
                }
            }
        },
        sequence: [
            /*
            TODO: issue a change
            TODO: verify that the update was called
            TODO: verify expected value
            TODO: delete the component
            TODO: assert no component at path 1
            TODO: create a component at path 1
            TODO: verify expected value (with update)
            */
            // the spreadsheet grade is available
            {
                func: "{getSpreadsheetDefaultsRequest}.send",
                args: []
            },
            {
                event: "{getSpreadsheetDefaultsRequest}.events.onComplete",
                listener: "fluid.test.spreadsheets.assertStatusCode",
                args: ["{getSpreadsheetDefaultsRequest}", 200]
            },
            // there is no component at the test component path
            {
                func: "{readComponentRequest}.send",
                args: []
            },
            {
                event: "{readComponentRequest}.events.onComplete",
                listener: "fluid.test.spreadsheets.assertStatusCode",
                args: ["{readComponentRequest}", 404]
            },
            // spreadsheets can be constructed
            {
                func: "{constructSpreadsheetRequest}.send",
                args: [{
                    type: 'spreadsheets.spreadsheet',
                    spreadsheetId: "spreadsheet1"
                }]
            },
            {
                event: "{constructSpreadsheetRequest}.events.onComplete",
                listener: "fluid.test.spreadsheets.assertStatusCode",
                args: ["{constructSpreadsheetRequest}", 201]
            },
            // spreadheets contain the expected data
            {
                func: "{bindModelClient}.connect"
            },
            {
                event: "{bindModelClient}.events.onConnect",
                listener: "jqUnit.assert",
                args: []
            },
            {
                event: "{bindModelClient}.events.onReceiveMessage",
                listener: "jqUnit.assertDeepEq",
                args: [
                    "Received initial message with the state of the component's model",
                    {
                        type: "initModel",
                        payload: {
                            values: [
                                [
                                    "Name",
                                    "Title",
                                    "Year"
                                ],
                                [
                                    "Ursula Franklin",
                                    "The Real World of Technology",
                                    "1989"
                                ],
                                [
                                    "Anna Lowenhaupt Tsing",
                                    "The Mushroom at the End of the World",
                                    "2015"
                                ],
                                [
                                    "Sage LaTorra and Adam Koebel",
                                    "Dungeon World",
                                    "2016"
                                ],
                                [
                                    "Ursula K. Le Guin",
                                    "The Compass Rose",
                                    "1982"
                                ]
                            ]
                        }
                    },
                    "{arguments}.0"
                ]
            },
            // Disconnect
            {
                func: "{bindModelClient}.disconnect"
            }
        ]
    }
];

kettle.test.bootstrapServer(fluid.tests.sheetsOnNexus.testDefs);
