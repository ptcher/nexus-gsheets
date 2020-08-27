'use strict';

var NEXUS_ADDRESS = 'localhost:7081';
var COMPONENT_PATH = 'testSpreadheet';
var SPREADSHEET_ID = '1B2769NqCW1yBlP_eT6kQ5iRBM1cbYyhB_0paDgNT6dk'
var SHEET_NAME = 'Sheet1';

var spreadsheets = fluid.registerNamespace('spreadsheets');

/**
 * A grade that displays its model as an HTML table whenever it is updated.
 */
fluid.defaults('spreadsheets.demos.helloWorld', {
    gradeNames: ['fluid.viewComponent'],
    model: {
        message: 'Hello world!'
    },
    modelListeners: {
        message: '{that}.displayTable'
    },
    invokers: {
        displayTable: {
            funcName: 'spreadsheets.demos.helloWorld.displayTable',
            args: ['{that}.model.message', '{that}.dom.messageArea']
        }
    },
    listeners: {
        'onCreate.announceSelf': {
            'this': 'console',
            method: 'log',
            args: ['the helloWorld component is ready']
        }
    },
    container: '.flc-spreadsheetContainer',
    selectors: {
        messageArea: '.flc-messageArea'
    }
});

spreadsheets.demos.helloWorld.displayJSON = function (json, dom) {
    dom.html(JSON.stringify(json, null, 4));
};

spreadsheets.demos.helloWorld.displayTable = function (model, dom) {
    var isHeaderRow = true;
    var sheetName = SHEET_NAME || "Sheet1";
    if (model[SHEET_NAME] !== undefined) {
        var rows = model[SHEET_NAME].values;
        var htmlTable = $("<table><thead><tr></tr></thead><tbody></tbody></table>");

        for (var headerCell of rows[0]) {
            var htmlHeaderCell = $("<th>").text(headerCell);
            htmlTable.find("tr").append(htmlHeaderCell);
        }

        for (var i = 1; i < rows.length; i++) {
            var row = rows[i];
            var htmlRow = $("<tr>");
            // TODO: put this in the page style
            for (var cell of row) {
                var htmlCell;
                htmlCell = $("<td>").text(cell);
                htmlRow.append(htmlCell);
            };
            htmlTable.find("tbody").append(htmlRow);
        };
        dom.append(htmlTable);
    }
};

// Construct a helloWorld component linked to a shadowComponent, which shadows a component on the Nexus
var helloWorld = fluid.construct('helloWorld', {
    type: 'spreadsheets.demos.helloWorld',
    model: {
        message: ''
    },
    modelRelay: {
        source: '{that}.shadow.model',
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
                    spreadsheetId: SPREADSHEET_ID
                }
            }
        }
    }
});
