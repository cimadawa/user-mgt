'use strict';

/**
 * Module dependencies.
 */
var express = require('express');
var nconf = require('nconf');
var fs = require('fs');
var path = require('path');
var cors = require('cors');
var _ = require('lodash');
var models = require('./models');
var bodyParser = require('body-parser');
var env = require('./configs/env');


var app = express();

/**
 * Loads the api and environment configurations.
 */
function loadConfigs() {
    nconf.argv().env();
    nconf.file({file: './configs/config.json'});
    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
}

/**
 * Initializes the`sequelize` connection and Sync all defined models to the DB.
 * Run: node server.js initSequelize
 * @returns {Promise} The promise will be resolved once the sync is completed.
 */
function initSequelize() {

    return models.initSequelize();
}

/**
 * Loads all the controllers listed in `controllers` directory.
 */
function loadControllers() {
    var controllersDir = path.join(__dirname, 'controllers/');
    fs.readdirSync(controllersDir)
        .filter(function (file) {
            return (file.indexOf('.') !== 0) && (file.slice(-3) === '.js');
        })
        .forEach(function (file) {
            var controller = require(path.join(controllersDir, file));
            app.use(controller.createRouter());
        });
}

/**
 * Registers a global error handler. Logs the error and sends a formatted error
 * message to user as the response.
 */
function registerErrorHandlers() {
    app.use(function (err, req, res, next) { // eslint-disable-line no-unused-vars
        console.log(err);
        res.status(400).json({ BADREQUEST: 'Something went wrong.'});
    });
}

/**
 * Load configurations and controllers before starting 'express' server.
 */
loadConfigs();
loadControllers();
registerErrorHandlers();
initSequelize();
app.listen(env.port, function () {
    console.log('The User MGT API listening on port %s', env.port);
});
