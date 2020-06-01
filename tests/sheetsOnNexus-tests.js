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

fluid.defaults("fluid.tests.sheetsOnNexus.constructSpreadsheet", {
    gradeNames: "kettle.test.request.http",
    path: "/components/%componentPath",
    port: "{configuration}.options.serverPort",
    method: "POST",
    termMap: {
        componentPath: "" // to be filled by test instances
    }
});

fluid.defaults("fluid.tests.sheetsOnNexus.bindModel", {
    gradeNames: "kettle.test.request.ws",
    path: "/bindModel/%componentPath/%modelPath",
    port: "{configuration}.options.serverPort",
    termMap: {
        // to be filled by test instances
        componentPath: "",
        modelPath: ""
    }
});

fluid.defaults("fluid.tests.sheetsOnNexus.destroyComponent", {
    gradeNames: "kettle.test.request.http",
    path: "/components/%componentPath",
    port: "{configuration}.options.serverPort",
    method: "DELETE",
    termMap: {
        componentPath: "" // to be filled by test instances
    }
});

fluid.tests.sheetsOnNexus.testDefs = [
    {
        name: "Operating spreadsheets through the Nexus",
        gradeNames: "kettle.test.testCaseHolder",
        expect: 4,
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
            constructSpreadsheetRequest: {
                type: "fluid.tests.sheetsOnNexus.constructSpreadsheet",
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
            constructModelComponentRequest1: {
                type: "fluid.tests.sheetsOnNexus.constructSpreadsheet",
                options: {
                    termMap: {
                        componentPath: "debugPath1"
                    }
                }
            },
            constructModelComponentRequest2: {
                type: "fluid.tests.sheetsOnNexus.constructSpreadsheet",
                options: {
                    termMap: {
                        componentPath: "debugPath2"
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
            assert no component at path 1
            create a component at path 1
            verify expected value
            bind a model to it
            issue a change
            verify that the update was called
            verify expected value
            delete the component
            assert no component at path 1
            create a component at path 1
            verify expected value (with update)

            // BELOW ARE NEXUS TESTS
            assert no component at path 2
            bind a model to it
            create a component at path 2
            */
            {
                func: "{getSpreadsheetDefaultsRequest}.send",
                args: []
            },
            {
                event: "{getSpreadsheetDefaultsRequest}.events.onComplete",
                listener: "fluid.test.spreadsheets.assertStatusCode",
                args: ["{getSpreadsheetDefaultsRequest}", 200]
            },
            // TODO: extend the Nexus with a GET /components/path.to.component endpoint
            // allowing asserts like this one to be executed externally
            // {
            //     func: "fluid.test.spreadsheets.assertNoComponentAtPath",
            //     args: [
            //         "Component not yet constructed",
            //         "{fluid.tests.nexus.componentRoot}",
            //         "{tests}.options.testComponentPath"
            //     ]
            // },
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
                args: ["{constructSpreadsheetRequest}", 200]
            },
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
