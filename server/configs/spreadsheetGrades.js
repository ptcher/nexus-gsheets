var fs = require('fs');
var {google} = require('googleapis');
var config = require('./sheetsAPI.config.json');
var fluid = fluid || require('infusion');
var coordToA1 = require('./coordToA1');

var CREDENTIALS_PATH = config.credentialsPath;
var TOKEN_PATH = config.tokenPath;
var SCOPES = config.scopes;

/**********************
 * SPREADSHEET GRADES *
 **********************/

var spreadsheets = fluid.registerNamespace('spreadsheets');
module.exports = spreadsheets;

// This logging function is used to trigger a breakpoint and get component tree state
spreadsheets.debug = function(...messages) {
    console.log(messages);
};

/**
 * component for reading and writing entire spreadsheets, located based on their id/URL
 */
// TODO: rename to something like remoteSpreadsheetAvatar
//       indicate clearly that this is the necessary "internal endpoint" that allows you to Infusion-ly interact with a spreadsheet "as if it were the same"
fluid.defaults('spreadsheets.spreadsheet', {
    gradeNames: ['fluid.modelComponent'],
    spreadsheetId: '', // the id of the host spreadsheet, which can be extracted from the URL
    members: {
        sheetBounds: {} // the coordinate ranges containing all data in each sheet 'tab', keyed by the sheetName
        // this may be significantly larger than the used cells without incurring any computational cost
    },
    components: {
        apiClient: { // the authorized API client
            type: 'spreadsheets.sheetsAPIClient'
        }
    },
    events: {
        doRemoteRead: null
    },
    listeners: { // read the remote spreadsheet on component creation
        // on component creation, get the content of the remote spreadsheet
        'onCreate.getRemoteContent': {
            // FIXME: I have the intuition that I should be able to replace the linked function with a record like
            // {
            //      this: 'fluid.promise',
            //      method: 'fireTransformEvent',
            //      args: ['{that}.events.doRemoteRead', '{apiClient}.getSpreadsheet({apiClient}, {that}.options.spreadsheetId)']
            // }
            // but it doesn't work. Is that an error of mine or an Infusion limitation?
            funcName: 'spreadsheets.spreadsheet.getRemoteContent',
            args: ['{that}', '{apiClient}'],
        },
        // these three listeners 
        'doRemoteRead.processMetadata': {
            funcName: 'spreadsheets.spreadsheet.processMetadata',
            args: ['{arguments}.0', '{that}', '{apiClient}'],
            priority: 'first'
        },
        'doRemoteRead.processData': {
            funcName: 'spreadsheets.spreadsheet.processData',
            args: ['{arguments}.0'],
            priority: 'after:processMetadata'
        },
        'doRemoteRead.updateModel': {
            changePath: '',
            value: '{arguments}.0',
            source: 'getRemoteContent',
            priority: 'after:processData'
        }
    },
    modelListeners: {
        // When the model is written to, update the remote sheet
        '*': {
            funcName: 'spreadsheets.spreadsheet.setRemoteContent',
            args: ['{that}', '{apiClient}', '{change}.path.0', '{change}.value'],
            excludeSource: 'getRemoteContent'
        }
    }
});

spreadsheets.spreadsheet.getRemoteContent = function (that, apiClient) {
    var promiseTogo = apiClient.getSpreadsheet(apiClient, that.options.spreadsheetId);
    fluid.promise.fireTransformEvent(that.events.doRemoteRead, promiseTogo);
};

spreadsheets.spreadsheet.processMetadata = function (metadata, that, apiClient) {
    var ranges = [];
    fluid.each(metadata.data.sheets, function (sheetObject) {
        var {title} = sheetObject.properties;
        var {columnCount, rowCount} = sheetObject.properties.gridProperties;
        var boundingRange = title + '!' + 'A1:' + spreadsheets.coordToA1(columnCount, rowCount);
        that.sheetBounds[title] = boundingRange;
        ranges.push(boundingRange);
    });
    var promiseTogo = apiClient.getRanges(
        apiClient,
        that.options.spreadsheetId,
        ranges
    );
    return promiseTogo;
}

spreadsheets.spreadsheet.processData = function (data) {
    var newModel = {};
    fluid.each(data.data.valueRanges, function ({range, values}) {
        var sheetName = range.split('!')[0];
        newModel[sheetName] = values;
    });
    return newModel;
}

/**
 * Convert a column and row to A1 notation, the conventional coordinate system of spreadsheets.
 * @param {Number} column The 1-indexed column number.
 * @param {Number} row The 1-indexed row number.
 * @returns {String} The coordinate in A1 notation.
 */
spreadsheets.coordToA1 = coordToA1;

/**
 * Send a new value for the component model to the remote spreadsheet.
 * @param {String} sheetName The name of the sheet (within the spreadsheet) the update is being issued to
 * @param {Array} value A 2D array representing the updated value of the sheet, as a list of rows.
 */
spreadsheets.spreadsheet.setRemoteContent = function(that, apiClient, sheetName, values) {
    var writePromise = apiClient.updateRange(apiClient, that.options.spreadsheetId, sheetName, that.sheetBounds[sheetName], values);
    writePromise.then(function(response) {
        fluid.log(fluid.logLevel.INFO, response);
    }, function(rejection) {
        fluid.log(fluid.logLevel.WARN, rejection);
    });
};

/**
 * A component managing a client for the Google Sheets API.
 * It takes care of creating and authenticating the client using the OAuth2 protocol, and exposes API endpoints as invokers.
 */
fluid.defaults('spreadsheets.sheetsAPIClient', {
    gradeNames: ['fluid.component'],
    members: {
        clientObject: null, // an authorized google API client object, filled with onCreate.impl
    },
    listeners: {
        // TODO: authorized client probably needs to be a further component, which will attempt to create itself repeatedly until it has token
        'onCreate.createAuthorizedClient': 'spreadsheets.sheetsAPIClient.createAuthorizedClient({that})'
    },
    invokers: {
        'getRange': 'spreadsheets.sheetsAPIClient.getRange',
        'getRanges': 'spreadsheets.sheetsAPIClient.getRanges',
        'getSpreadsheet': 'spreadsheets.sheetsAPIClient.getSpreadsheet',
        'updateRange': 'spreadsheets.sheetsAPIClient.updateRange'
    }
});

/**
 * Create and authorize an OAuth2 client providing the google sheets API
 * @param {Object} that The component representing the client
 */
spreadsheets.sheetsAPIClient.createAuthorizedClient = function(that) {
    var credentials = fs.readFileSync(CREDENTIALS_PATH);
    credentials = JSON.parse(credentials);
    var { client_secret, client_id, redirect_uris } = credentials.installed;
    var oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    var token = fs.readFileSync(TOKEN_PATH);
    if (token) {
        token = JSON.parse(token);
    } else { 
        // TODO: get the new file if the token doesn't already exist
        // this requires user interaction
    }

    oAuth2Client.setCredentials(token);

    that.clientObject = new google.sheets({
        version: 'v4',
        auth: oAuth2Client
    });
};

/**
 * Get a particular range of values in a particular spreadsheet.
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
 * @param {Object} that the sheetsAPIClient component.
 * @param {String} spreadsheetId the id of the host spreadsheet, which can be extracted from its URL.
 * @param {String} sheetName the name of the host sheet, defaults to "Sheet1" in single-sheet spreadsheets.
 * @param {String} range the range of values to get, expressed in A1 notation.
 * @return {Promise} resolves with the addressed value or a rejection.
 */
spreadsheets.sheetsAPIClient.getRange = function(that, spreadsheetId, sheetName, coordinate) {
    let promiseTogo = that.clientObject.spreadsheets.values.get({
        spreadsheetId, 
        range: sheetName + '!' + coordinate
    });
    return promiseTogo;
};

/**
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchGet
 * @param {Object} that the sheetsAPIClient component.
 * @param {String} spreadsheetId the id of the host spreadsheet, which can be extracted from its URL.
 * @param {Array<String>} ranges an array of objects representing the ranges in A1 notation, e.g. "Sheet1!A1:B7".
 * @return {Promise} resolves with the addressed value or a rejection.
 */
spreadsheets.sheetsAPIClient.getRanges = function(that, spreadsheetId, ranges) {
    let promiseTogo = that.clientObject.spreadsheets.values.batchGet({spreadsheetId, ranges});
    return promiseTogo;
}

/**
 * Get all values in all sheets of a particular spreadsheet.
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/get
 * @param {Object} that the sheetsAPIClient component.
 * @param {String} spreadsheetId the id of the spreadsheet, which can be extracted from its URL.
 * @return {Promise} resolves with the spreadsheet as a JSON object or a rejection.
 */
spreadsheets.sheetsAPIClient.getSpreadsheet = function(that, spreadsheetId) {
    let promiseTogo = that.clientObject.spreadsheets.get({spreadsheetId});
    return promiseTogo;
};

/**
 * Set the values in a range in a spreadsheet
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
 * @param {Object} that the sheetsAPIClient component.
 * @param {String} spreadsheetId the id of the host spreadsheet, which can be extracted from its URL.
 * @param {String} sheetName the name of the host sheet, defaults to "Sheet1" in single-sheet spreadsheets.
 * @param {String} range the range of values to get, expressed in A1 notation.
 * @return {Promise} resolves with an HTTP status indicating whether the write was successful.
 */
spreadsheets.sheetsAPIClient.updateRange = function(that, spreadsheetId, sheetName, range, values) {
    var promiseTogo = that.clientObject.spreadsheets.values.update({
        spreadsheetId,
        range: range, // FIXME: I need to be consistent about where the transformation of range to sheetName!range happens,
        // i.e. whether client expects them pre-formatted (as the API does) or not
        valueInputOption: 'USER_ENTERED', // elements in {values} are formatted as strings, but will be interpreted as numbers, dates, etc.
        includeValuesInResponse: false,
        responseDateTimeRenderOption: 'FORMATTED_STRING',
        resource: {
            majorDimension: 'ROWS', // {values} is an array of arrays, where the inner arrays represent rows
            values
        }
    });
    return promiseTogo;
}
