'use strict';

/**
 * Module dependencies.
 */
var bcrypt = require('bcryptjs');

/**
 * Defines the User model.
 */
module.exports = function (sequelize, DataTypes) {
    var User = sequelize.define("user", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        passwordHash: DataTypes.STRING,
        password: {
            type: DataTypes.VIRTUAL,
            set: function (password) {
                this.setDataValue('password', password);
                this.setDataValue('passwordHash', bcrypt.hashSync(password, 10));
            },
            validate: {
                notEmpty: true,
                len: {
                    args: 8,
                    msg: 'Minimum password length is 8'
                }
            }
        },
        authyId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        countryCode: {
            type: DataTypes.STRING,
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false
        },
        is_approved: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        }
        }, {
            instanceMethods: {
                validatePassword: function (password) {
                    return bcrypt.compareSync(password, this.get().passwordHash);
                }
            }
        }
    );

    return User;
};