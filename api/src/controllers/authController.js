'use strict';

/**
 * Module dependencies.
 */
var env = require('../configs/env');
var Models = require('../models');
var moment = require('moment');
var jwt = require('jwt-simple');
var nconf = require('nconf');
var express = require('express');
var HTTPStatus = require('http-status');
var Promise = require('bluebird');
var Client = require('authy-client').Client;
var authyClient = new Client({key: env.authyAPIKey});

/**
 * Checks if the request body has required data to Signup.
 *
 * @param body The request body.
 * @returns {boolean|*} The validation status.
 */
function validateRequestDataForSignup(body) {
    var validated = true;

    if(!body.hasOwnProperty('name') || body.name === null)
    {
        validated = false;
    }

    if(!body.hasOwnProperty('email') || body.email === null)
    {
        validated = false;
    }

    if(!body.hasOwnProperty('password') || body.password === null)
    {
        validated = false;
    }

    if(!body.hasOwnProperty('countryCode') || body.countryCode === null)
    {
        validated = false;
    }

    if(!body.hasOwnProperty('phone') || body.phone === null)
    {
        validated = false;
    }
    return validated;
}

/**
 * Exports the configured `router` for auth endpoint.
 */
module.exports = {
    /**
     * User login.
     * @returns {Function}
     */
    userLogin: function () {
        return function (req, res, next) {
            var data = req.body;
            if (data.hasOwnProperty('email') && data.hasOwnProperty('password')) {
                var User = Models.getModelForSync('user');

                User.findOne(
                    { where: { email: data.email, passwordHash: {$ne: null}}})
                    .then(function (user) {
                        if (user && user.validatePassword(data.password)) {
                            return authyClient.requestSms({ authyId: user.authyId });
                        } else {
                            return Promise.reject(res.status(HTTPStatus.UNAUTHORIZED).json(
                                {UNAUTHORIZED: 'Invalid email and/or password'}));
                        }
                    })
                    .then(function(userEmail, response) {
                        console.log('SMS requested to ${response.cellphone}');
                        res.status(HTTPStatus.OK).json(
                            {
                                success: true,
                                message: 'User successfully added to system.',
                                email: userEmail
                            });
                    }.bind(null, data.email))
                    .catch(function (error) {
                        next(error);
                    });
            } else {
                next(res.status(HTTPStatus.BAD_REQUEST).json({
                    UNAUTHORIZED: 'Email or password can not be empty.'
                }));
            }
        };
    },
    /**
     * New user signup with 2FA.
     * @returns {Function}
     */
    signup: function () {
        return function (req, res, next) {
            if (validateRequestDataForSignup(req.body)) {
                var User = Models.getModelForSync('user');
                var requestBody = req.body;
                User.findOne({
                    where: {
                        email: req.body.email
                    }
                })
                    .then(function (user) {
                        if(!user)
                        {
                            return User.create({
                                name: req.body.name,
                                email: req.body.email,
                                password: req.body.password,
                                countryCode: req.body.countryCode,
                                phone: req.body.phone
                            });
                        }
                        else{
                            return Promise.reject(res.status(HTTPStatus.BAD_REQUEST).json(
                                { CONFLICT: 'Email is already exist.'}));
                        }
                    })
                    .then(function (newUser) {
                        return authyClient.registerUser(
                        {
                            email: newUser.email,
                            countryCode: newUser.countryCode,
                            phone: newUser.phone
                        });
                    })
                    .then(function (userEmail, authyResponse) {
                        if (!authyResponse.success) {
                            return Promise.reject(res.status(HTTPStatus.INTERNAL_SERVER_ERROR).json(
                                {UNAUTHORIZED: 'Authy registration failed.'}));
                        }
                        return User.update(
                            {
                                authyId: authyResponse.user.id
                            },
                            {
                                where: {
                                    email: userEmail
                                }
                            });
                    }.bind(null, requestBody.email))
                    .then(function(userEmail, updateStatus){
                        return User.findOne({
                            where: {
                            email: userEmail
                        }});
                    }.bind(null, requestBody.email))
                    .then(function (user) {
                        return authyClient.requestSms({ authyId: user.authyId });
                    })
                    .then(function(userEmail, response) {
                        console.log('SMS requested to ${response.cellphone}');
                        res.status(HTTPStatus.CREATED).json(
                            {
                                success: true,
                                message: 'User successfully added to system.',
                                email: userEmail
                            });
                    }.bind(null, requestBody.email))
                    .catch(function (error) {
                        next(error);
                    });
            } else {
                next(res.status(HTTPStatus.BAD_REQUEST).json({BADREQUEST: 'Check json data.'}));
            }
        };
    },
    /**
     * Verify 2FA token or start one touch flow.
     * @returns {Function}
     */
    verifyToken: function () {
        return function (req, res, next) {
            if(req.body.hasOwnProperty('email') && req.body.email!==null &&
                req.body.hasOwnProperty('token') && req.body.token!==null){
                var User = Models.getModelForSync('user');
                var requestBody = req.body;
                User.findOne({
                    where:{
                        email: req.body.email
                    }
                })
                    .then(function (token, user) {
                        return authyClient.verifyToken({ authyId: user.authyId, token: token })
                    }.bind(null, requestBody.token))
                    .then(function (response) {
                        console.log(response);
                        return User.findOne({
                            where: {
                                email: req.body.email
                            }
                        });
                    })
                    .then(function(user) {
                        user.is_approved = true;
                        return user.save();
                    })
                    .then( function(){
                        res.status(HTTPStatus.OK).json({
                            success: true,
                            message: 'User successfully verified.'
                        });
                    })
                    .catch(function (error) {
                    next(error);
                });
            }
            else {
                next(res.status(HTTPStatus.BAD_REQUEST).json({
                    UNAUTHORIZED: 'Email or token can not be empty.'
                }));
            }

        };
    },
    /**
     * Request One Touch approval.
     * @returns {Function}
     */
    oneTouchApprovalRequest: function () {
        return function (req, res, next) {
            if(req.body.hasOwnProperty('email')){
                var User = Models.getModelForSync('user');
                User.findOne({
                    where:{
                        email: req.body.email
                    }
                })
                    .then(function (user) {
                        if(!user.is_approved){
                            next(res.status(HTTPStatus.BAD_REQUEST).json({
                                UNAUTHORIZED: 'User not verified to use this service.'
                            }));
                        }
                        return authyClient.createApprovalRequest({
                            authyId: user.authyId,
                            details: {
                                hidden: {
                                    mode: 'TestApplication'
                                },
                                visible: {
                                    authyId: user.authyId,
                                    name: user.name,
                                    email: user.email,
                                }
                            },
                            message: 'Login requested for a UserMGT account.',
                        }, {
                            ttl: 120
                        });
                    })
                    .then(function (response) {
                        res.status(HTTPStatus.OK).json({
                                success: true,
                                taskId: response.approval_request.uuid
                        });
                    })
                    .catch(function (error) {
                        next(error);
                    });
            }
            else {
                next(res.status(HTTPStatus.BAD_REQUEST).json({
                    UNAUTHORIZED: 'Email or token can not be empty.'
                }));
            }
        };
    },
    /**
     * Check if the user approved the One Touch request.
     * @returns {Function}
     */
    oneTouchApprovalStatus: function () {
        return function (req, res, next) {
            if (req.body.hasOwnProperty('taskId')){
                return authyClient.getApprovalRequest({
                    id: req.body.taskId
                })
                    .then(function (response) {
                        console.log('Approval request', response.approval_request);
                        if (response.approval_request) {
                            res.status(HTTPStatus.OK).json({
                                success: true,
                                message: 'User successfully verified.'
                            });
                        }
                    })
                    .catch(function (error) {
                        next(error);
                    });
            }
            else {
                next(res.status(HTTPStatus.BAD_REQUEST).json({
                    UNAUTHORIZED: 'Email or token can not be empty.'
                }));
            }
        };
    },
    /**
     * Create URL routers for auth app.
     * @returns {*}
     */
    createRouter: function () {
        var router = express.Router();

        router.post('/api/login',
            this.userLogin());

        router.post('/api/signup',
            this.signup());

        router.post('/api/verifyToken',
            this.verifyToken());

        router.post('/api/oneTouch',
            this.oneTouchApprovalRequest());

        router.post('/api/oneTouch/status',
            this.oneTouchApprovalStatus());

        return router;
    }
};
