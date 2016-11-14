'use strict';

angular.module('app', [
    'app.auth',
    'app.dashboard',
    'ui.router',
    'ui.bootstrap',
    'ngAnimate',
    'ngProgressLite',
    'checklist-model',
    'ngResource',
    'ngCookies',
    'blockUI',
    'angular-flash.service',
    'angular-flash.flash-alert-directive'
    ])
    .provider('baseUrl', function () {
        this.URL = '/dashboard';
        this.$get = function () {
            return {URL: '/dashboard'};
        };
    })

    .value('localStorage', window.localStorage)

    .config(['$stateProvider', '$urlRouterProvider', '$httpProvider', 'flashProvider', '$locationProvider',
        'blockUIConfigProvider', 'ngProgressLiteProvider', '$resourceProvider',
        function ($stateProvider, $urlRouterProvider, $httpProvider, flashProvider, $locationProvider,
                  blockUIConfigProvider, ngProgressLiteProvider, $resourceProvider) {
            $stateProvider.state('app', {
                abstract: true,
                templateUrl: 'scripts/app.tpl.html',
                controller: 'AppController'
            });
            $urlRouterProvider.otherwise('/login');
            flashProvider.errorClassnames.push('alert-danger');
            $httpProvider.interceptors.push('authInterceptor');
            ngProgressLiteProvider.settings.speed = 2000;
            blockUIConfigProvider.autoBlock(false);
            $resourceProvider.defaults.stripTrailingSlashes = false;
            $locationProvider.html5Mode(true);
        }])
    .controller('AppController', ['$scope', '$state', '$http', 'authService',
        function ($scope, $state, $http, authService) {

            function checkAuthentication(callBack) {
                if (authService.isLoggedIn()) {
                    if (callBack) {
                        callBack();
                    }
                }
                else {
                    if (!$state.includes('campaigns')) {
                        $state.go('auth.login');
                    }
                }
            }

            function buildNavigation() {
                $scope.navigationLinks = [];
            }

            $scope.logout = function () {
                authService.logout();
            };

            $scope.$on('auth.userLoggedOut', function () {
                checkAuthentication();
            });

            checkAuthentication(buildNavigation);
        }])

    .run(['$rootScope', 'authService', '$state',
        function ($rootScope, authService, $state) {
            $rootScope.$on('$stateChangeStart', function (event, toState) {
                if (toState.name === 'auth.login' && authService.isLoggedIn()) {
                    event.preventDefault();
                    $state.go('app.dashboard');
                }
            });
        }])

    .directive('focus', ['$timeout', function ($timeout) {
        return {
            scope: {trigger: '@focus'},
            link: function (scope, element) {
                scope.$watch('trigger', function (value) {
                    if (value === 'true') {
                        $timeout(function () {
                            element[0].focus();
                        });
                    }
                });
            }
        };
    }]);