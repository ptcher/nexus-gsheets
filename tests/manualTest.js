var spreadsheets = require('../src/server/spreadsheetGrades');

/* 
 * This test constructs a spreadsheet component with an actual google sheet.
 * As such, it is fragile to connectivity, credentials, and the sheet disappearing.
 * It should not be added to the automatic test suite.
 */

fluid.construct('spreadsheetTestLocation', {
    type: 'spreadsheets.spreadsheet',
    spreadsheetId: '1B2769NqCW1yBlP_eT6kQ5iRBM1cbYyhB_0paDgNT6dk'
});

var spreadsheet = fluid.componentForPath("spreadsheetTestLocation");

// Waiting for spreadsheet model to be populated
setTimeout(function () {
    var modelValues = fluid.getForComponent(spreadsheet, "model");
    console.log('Model for constructed spreadsheet: ', JSON.stringify(modelValues, null, 2));
}, 2000);

//spreadsheet.applier.change('sheet1', [['empty']]);
