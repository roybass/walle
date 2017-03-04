var walleApp = angular.module('walleApp', ['ngRoute', 'ngTagsInput', 'ngNumeraljs', '720kb.tooltips']);

walleApp.controller('MainController', ($scope, $route, $routeParams, $location) => {
  $scope.$route = $route;
  $scope.$location = $location;
  $scope.$routeParams = $routeParams;
});


walleApp.config(function ($routeProvider, $locationProvider) {
  $locationProvider.hashPrefix('');
  $routeProvider
    .when("/main", {
      templateUrl: "templates/main.html"
    })
    .when("/route", {
      templateUrl: "templates/route.html"
    })
    .otherwise("/main");
});