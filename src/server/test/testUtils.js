'use strict';

// TODO: clean up these different requires, ask what's appropriate, e.g. fluid.require vs require
var fluid = require('infusion'),
    jqUnit = fluid.require("node-jqunit");

fluid.require('infusion-nexus');

fluid.registerNamespace('fluid.test.spreadsheets');

fluid.test.spreadsheets.assertNoComponentAtPath = function (message, componentRoot, path) {
    jqUnit.assertFalse(message, fluid.nexus.containsComponent(componentRoot, path));
};

fluid.test.spreadsheets.assertStatusCode = function (request, expectedStatusCode) {
    var response = request.nativeResponse;
    jqUnit.assertEquals("Response has status code " + expectedStatusCode, expectedStatusCode, response.statusCode);
};