'use strict';

// TODO get this from a config
var nexusAddress = 'ws://localhost:7081';

var componentPath = 'testSheet';
var modelPath = 'sheet1';

// start a WebSocket
var ws = new WebSocket(nexusAddress + '/bindModel/' + componentPath + '/' + modelPath);

// log any messages received on the WebSocket
ws.onopen = function (event) {
    ws.onmessage = function (event) {
        console.log(event.data);
    };
};

/*
fluid.construct("demo", {
    type: "spreadsheets.demo",
    options: {
        selectors: {
            main: "body",
            valueDisplay: ".value-display"
        }
    }
});
*/
