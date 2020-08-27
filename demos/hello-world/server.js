'use strict';

var fluid = require('infusion'),
    kettle = require('kettle');

fluid.require('infusion-nexus');

// a config is equivalent to a grade definition.
// in kettle, these are grades descending from kettle ones for running a server and handling requests
// but I could equally use them to load some "domain object" grades onto a Nexus server for later instantiation

// start the server defined by our config
kettle.config.loadConfig({
    // this path tells us where to find the config relative to this file's host folder
    configPath: kettle.config.getConfigPath('./configs'),
    // this tells us the name of the JSON file (sans file type) containing the config
    configName: kettle.config.getConfigName('nexusWithSpreadsheets.config')
});
