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

// TODO: make a GET /components/ Nexus API endpoint
fluid.test.spreadsheets.assertComponentModel = function (request, expectedModelContent) {

    // these are what I would execute in a local context
    var that = fluid.componentForPath("path");

    var value = fluid.getForComponent(that, "model.thing.thing");

    // it seems like for asynchronously fetched models, we either need to delay component construction messages or get their contents specifically via model binding
    // I suspect the latter is more appropriate, considering that there could easily be legitimate contexts where we want to let the component hang around before the model reaches its final state.
    // the first message is the model content
};