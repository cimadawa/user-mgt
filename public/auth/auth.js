'use strict';

angular.module('app.auth', ['ui.router'])

    .config(['$stateProvider',
        function ($stateProvider) {
            $stateProvider.state('auth', {
                abstract: true,
                templateUrl: 'scripts/auth/auth.tpl.html'
            });

            $stateProvider.state('auth.login', {
                url: '/login',
                templateUrl: 'scripts/auth/login.tpl.html',
                controller: 'LoginController'
            });

            $stateProvider.state('auth.verifyToken', {
                url: '/dashboard/verify/:email',
                templateUrl: 'scripts/auth/verify.tpl.html',
                controller: 'VerifyController'
            });

            $stateProvider.state('auth.register', {
                url: '/dashboard/register',
                templateUrl: 'scripts/auth/register.tpl.html',
                controller: 'RegisterController'
            });

            $stateProvider.state('auth.oneTouchCheck', {
                url: '/dashboard/oneTouch/statusCheck/:taskId',
                templateUrl: 'scripts/auth/oneTouchStatusCheck.tpl.html',
                controller: 'OneTouchStatusController'
            });
        }])

    .controller('LoginController', ['$scope', '$state', 'authService', 'flash',
        function ($scope, $state, authService, flash) {
            $scope.credentials = {
                email: '',
                password: ''
            };

            $scope.reset = function () {
                $scope.credentials.email = '';
                $scope.credentials.password = '';
                $scope.loginForm.$setPristine();
            };

            $scope.userSignup= function () {
                $state.go('auth.register');
            };

            $scope.login = function (credentials) {
                authService.login(credentials)
                    .success(function (data) {
                        if (data.success)
                        {
                            $state.go('auth.verifyToken', {email: data.email});
                        }
                    })
                    .error(function () {
                        $scope.reset();
                        document.getElementById('email').focus();
                        flash.error = 'Invalid email or password!';
                    });
            };
        }])


    .controller('RegisterController', ['$scope', '$state', 'authService', 'flash',
        function ($scope, $state, authService, flash) {
            $scope.newUser = {
                name: '',
                email: '',
                password: '',
                countryCode: '',
                phone: ''
            };

            $scope.reset = function () {
                $scope.newUser.name = '';
                $scope.newUser.email = '';
                $scope.newUser.password = '';
                $scope.newUser.countryCode = '';
                $scope.newUser.phone = '';
            };

            $scope.cancel = function () {
                $state.go('auth.login');
            };

            $scope.register = function (newUser) {
                authService.register(newUser)
                    .success(function (data) {
                        if (data.success)
                        {
                            $state.go('auth.verifyToken', {email: data.email});
                        }
                    })
                    .error(function (error) {
                        $scope.reset();
                        document.getElementById('email').focus();
                        flash.error = error;
                    });
            };
        }])


    .controller('VerifyController', ['$scope', '$state', '$stateParams', 'authService', 'oneTouchService','flash',
        function ($scope, $state, $stateParams, authService, oneTouchService, flash) {
            $scope.credentials = {
                email: '',
                token: ''
            };

            $scope.reset = function () {
                $scope.credentials.email = $stateParams.email;
                $scope.credentials.token = '';
            };

            $scope.useOneTouch = function (email) {
                oneTouchService.create(email)
                    .success(function (data) {
                        $state.go('auth.oneTouchCheck', {taskId: data.taskId})
                    })
                    .error(function (error) {
                        flash.error = error;
                    });

            };
            $scope.reset();

            $scope.verify = function (credentials) {
                authService.verify(credentials)
                    .error(function () {
                        $scope.reset();
                        document.getElementById('token').focus();
                        flash.error = 'Invalid token or expired!';
                    });
            };

            $scope.$on('auth.loggedIn', function () {
                // TODO: Use the account service and store the loggedIn user's information into localStorage.
                $state.go('app.dashboard');
            });
        }])

    .controller('OneTouchStatusController', ['$scope', '$state', '$stateParams','oneTouchService', '$rootScope', '$interval', 'flash',
        function ($scope, $state, $stateParams, oneTouchService, $rootScope, $interval, flash) {
            $scope.taskId = '';

            $scope.checkStatus = function (taskId) {
                oneTouchService.checkStatus(taskId)
                    .success(function (data) {
                        if (data.success)
                        {
                            localStorage.loggedIn = true;
                            $rootScope.$broadcast('auth.loggedIn');
                        }
                    })
                    .error(function () {
                        $scope.reset();
                        document.getElementById('email').focus();
                        flash.error = 'OneTouch request denied or expired.';
                        $state.go('auth.login');
                    });
            };

            $interval(function () {
                $scope.checkStatus($stateParams.taskId);
            },2000);


            $scope.$on('auth.loggedIn', function () {
                // TODO: Use the account service and store the loggedIn user's information into localStorage.
                $state.go('app.dashboard');
            });
        }])

    .service('oneTouchService', ['$http',
        function ($http) {
            var baseUrl = 'http://localhost:3005/api/';
            var headers = {
                'Content-Type': 'application/json'
            };
            this.create = function (userEmail) {
                return $http({
                    method: 'POST',
                    url: baseUrl + 'oneTouch/',
                    headers: headers,
                    data: {
                        email: userEmail
                    }
                });
            };

            this.checkStatus = function (taskId) {
                return $http({
                    method: 'POST',
                    url: baseUrl + 'oneTouch/status',
                    headers: headers,
                    data: {
                        taskId: taskId
                    }
                });
            };
        }])

    .service('authService', ['$http', '$rootScope', 'localStorage',
        function ($http, $rootScope, localStorage) {

            var baseUrl = 'http://localhost:3005/api/';
            var headers = {
                'Content-Type': 'application/json'
            };
            this.isLoggedIn = function () {
                return localStorage.loggedIn;
            };

            this.register = function (newUser) {
                return $http({
                    method: 'POST',
                    url: baseUrl + 'signup/',
                    headers: headers,
                    data: {
                        name: newUser.name,
                        email: newUser.email,
                        password: newUser.password,
                        countryCode: newUser.countryCode,
                        phone: newUser.phone
                    }
                });
            };

            this.login = function (credentials) {
                return $http({
                    method: 'POST',
                    url: baseUrl + 'login/',
                    headers: headers,
                    data: {
                        email: credentials.email,
                        password: credentials.password
                    }
                });
            };

            this.verify = function (credentials) {
                return $http({
                    method: 'POST',
                    url: baseUrl + 'verifyToken/',
                    headers: headers,
                    data: {
                        email: credentials.email,
                        token: credentials.token
                    }
                }).success(function (data) {
                    if (data.success) {
                        localStorage.loggedIn = true;
                        $rootScope.$broadcast('auth.loggedIn');
                    }
                }).error(function () {
                    $rootScope.$broadcast('auth.errorOccured');
                });
            };

            this.logout = function () {
                localStorage.loggedIn = false;
                localStorage.clear();
                $rootScope.$broadcast('auth.userLoggedOut');
                $http.get('/');
            };
        }])

    .factory('authInterceptor', ['$cookies', '$rootScope', 'localStorage', '$q',
        function ($cookies, $rootScope, localStorage, $q) {
            return {
                responseError: function (rejection) {
                    if (rejection.config.url.indexOf('api/') === 0 && rejection.status === 403) {
                        localStorage.loggedIn = false;
                        localStorage.clear();
                        $rootScope.$broadcast('auth.userLoggedOut');
                        return rejection;
                    }
                    return $q.reject(rejection);
                }
            };
        }]);