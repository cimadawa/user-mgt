'use strict';

angular.module('app.dashboard', ['ui.router'])
    .config(['$stateProvider', function ($stateProvider) {
        $stateProvider.state('app.dashboard', {
            url: '/',
            templateUrl: 'scripts/dashboard/dashboard.tpl.html',
            controller: 'dashboardController'
        });
    }])

    .controller('dashboardController', ['$scope', function ($scope) {

    }]);