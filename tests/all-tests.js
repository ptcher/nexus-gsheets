'use strict';

var fluid = require('infusion');

var tests = [
    './coordToA1-tests.js'
];

fluid.each(tests, function (path) {
    require(path);
});
