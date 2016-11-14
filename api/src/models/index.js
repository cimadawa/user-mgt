'use strict';

/**
 * Module dependencies.
 */
var Sequelize = require('sequelize');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var Promise = require("bluebird");

/**
 * Files that should not imported as models.
 */
var filesToSkip = ['index.js'];

/**
 * Holds the initialized sequelize instance.
 */
var sequelize;

/**
 * Holds the imported `sequelize` models.
 */
var dbModels = {};

module.exports = {

    /**
     * Initializes a new `sequelize` connection with `SQLite`, imports all
     * the models listed in the directory and invokes the `sequelize.sync()` to
     * Sync all defined models to the DB.
     */
    initSequelize: function () {
        sequelize = new Sequelize('votes-app-db', null, null, {
            dialect: 'sqlite',
            storage: 'development.sqlite',
            logging: false
        });

        fs.readdirSync(__dirname)
            .forEach(function (file) {
                if (!_.include(filesToSkip, file)) {
                    var model = sequelize.import(file);
                    dbModels[model.name] = model;
                }
            });

        return sequelize.sync({ force: true});
    },

    /**
     * Gets a `sequelize` model for provided identifier.
     *
     * @param identifier The identifier of the model.
     * @returns {*} The `sequelize` model.
     */
    getModelFor: function (identifier) {
        return new Promise(function (resolve, reject) {
            if (_.has(dbModels, identifier)) {
                resolve(dbModels[identifier]);
            } else {
                var error =  new Error('Cannot find a model for ' + identifier);
                reject(error);
            }
        });
    },

    getModelForSync: function(identifier) {
        return dbModels[identifier];
    }
};
