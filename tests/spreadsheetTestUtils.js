'use strict';

// TODO: clean up these different requires, ask what's appropriate, e.g. fluid.require vs require
var fluid = require('infusion'),
    jqUnit = fluid.require("node-jqunit");

fluid.require('infusion-nexus');
require('../server/configs/spreadsheetGrades.js');

fluid.registerNamespace('fluid.test.spreadsheets');

fluid.test.spreadsheets.assertNoComponentAtPath = function (message, componentRoot, path) {
    jqUnit.assertFalse(message, fluid.nexus.containsComponent(componentRoot, path));
};

fluid.test.spreadsheets.assertStatusCode = function (request, expectedStatusCode) {
    var response = request.nativeResponse;
    var read = response.read();
    response.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
    });
    jqUnit.assertEquals("Response has status code " + expectedStatusCode, expectedStatusCode, response.statusCode);
};

fluid.test.spreadsheets.assertComponentModel = function (request, expectedModelContent) {

    // these are what I would execute in a local context
    var that = fluid.componentForPath("path");

    var value = fluid.getForComponent(that, "model.thing.thing");

    // it seems like for asynchronously fetched models, we either need to delay component construction messages or get their contents specifically via model binding
    // I suspect the latter is more appropriate, considering that there could easily be legitimate contexts where we want to let the component hang around before the model reaches its final state.
    // the first message is the model content
};

/* 
 * A mock grade that substitutes the google API object with one that returns test values
 * Note that while this allows us to test that the correct API calls are being made,
 * it does not currently allow us to test the authorization workflow
 **/
fluid.defaults('fluid.test.spreadsheets.sheetsAPIClientMock', {
    gradeNames: ['spreadsheets.sheetsAPIClient'],
    listeners: {
        'onCreate.createAuthorizedClient': 'fluid.test.spreadsheets.createAuthorizedClient({that})'
    }
});

/*
 * Note: no test data should have more than 26 columns.
 * We test the ability to address larger spreadsheets correctly in coordToA1-tests
*/
fluid.test.spreadsheets.testData = {
    spreadsheet1: {
        sheet1: {
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
    }
};

fluid.test.spreadsheets.createAuthorizedClient = function(that) {

    var getSpreadsheet = function ({spreadsheetId}) {
        var sheets = [];

        for (var sheetTitle in fluid.test.spreadsheets.testData[spreadhsheetId]) {
            sheets.push({
                properties: {
                    title: sheetTitle,
                    gridProperties: {
                        rowCount: 1000,
                        columnCount: 26
                    }
                }
            });
        }

        return new Promise(function (resolve, reject) {
            resolve({
                data: {
                    spreadsheetId: spreadsheetId,
                    sheets: sheets
                }
            });
        });
    };

    var interpretRange = function (range) {
        // interpret the range as 0-indexed array intervals
        var [sheetName, coords] = range.split('!');
        var [start, end] = coords.split(':');
        var lettersAndNumbers = /([A-Z+])(\d+)/;
        var [columnStart, rowStart] = start.match(lettersAndNumbers).slice(1);
        var [columnEnd, rowEnd] = end.match(lettersAndNumbers).slice(1);
        columnStart = columnStart.charCodeAt(0) - 65;
        columnEnd = columnEnd.charCodeAt(0) - 65;
        rowStart -= 1;
        rowEnd -= 1;

        return {
            sheetName,
            columnStart,
            columnEnd,
            rowStart,
            rowEnd
        }
    };

    // note that these tests assume single-letter column numbers
    var getRange = function (mockSpreadsheet, range) {
        var {sheetName, columnStart, columnEnd, rowStart, rowEnd} = interpretRange(range);

        // look up the intervals in the mock spreadsheet, which stores them as 2D arrays
        var fullSheet = mockSpreadsheet[sheetName];
        rangeInSheet = fullSheet.slice(rowStart, rowEnd + 1).map(function (row) {
            return row.slice(columnStart, columnEnd + 1);
        });

        return rangeInSheet;
    };

    var updateRange = function(mockSpreadsheet, range, values) {
        var {sheetName, columnStart, columnEnd, rowStart, rowEnd} = interpretRange(range);

        var sheet = mockSpreadsheet[sheetName];

        valueIndex = 0;

        for (var rowIndex = rowStart; rowIndex <= rowEnd; rowIndex++) {
            rowToUpdate = sheet[rowIndex];
            newValues = values[valueIndex];

            if (newValues.length !== columnEnd - columnStart) {
                fluid.fail('Size of data to update does not match range to update');
            }

            rowToUpdate.splice(columnStart, columnEnd - columnStart, ...newValues);
            valueIndex++;
        }
    };

    var getValues = function ({spreadsheetId, range}) {
        return new Promise(function (resolve, reject) {
            resolve({
                data: {
                    range: range,
                    majorDimensions: "ROWS",
                    values: getRange(fluid.test.spreadsheets.testData[spreadsheetId], range),
                }
            });
        });
    };

    var batchGetValues = function ({spreadsheetId, ranges}) {
        var valueRanges = [];

        for (var range of ranges) {
            valueRanges.push({
                range: range,
                majorDimensions: "ROWS",
                values: getRange(fluid.test.spreadsheets.testData[spreadsheetId], range)
            });
        }

        return new Promise(function (resolve, reject) {
            resolve({
                data: {
                    spreadsheetId: spreadsheetId,
                    valueRanges: valueRanges
                }
            });
        });
    };

    var updateValues = function ({spreadsheetId, range, valueInputOption, includeValuesInResponse, responseDateTimeRenderOption, resource}) {
        return new Promise(function (resolve, reject) {
            updateRange(fluid.test.spreadsheets.testData[spreadsheetId], range, resource.values);

            resolve({
                data: {
                    spreadsheetId: spreadsheetId,
                    updatedRange: range
                }
            });
        });
    };

    that.clientObject = {
        spreadsheets: {
            get: getSpreadsheet,
            values: {
                get: getValues,
                batchGet: batchGetValues,
                update: updateValues
            }
        }
    };
};