var walleApp = angular.module('walleApp', ['ngRoute', 'ngTagsInput', 'ngNumeraljs', '720kb.tooltips', 'googlechart', 'ng-fileDialog']);

walleApp.controller('MainController', ($scope, $route, $routeParams, $location) => {
  $scope.$route = $route;
  $scope.$location = $location;
  $scope.$routeParams = $routeParams;

  $scope.isActive = function (viewLocation) { 
    return viewLocation === $scope.$location.path();
  };
});


walleApp.config(function ($routeProvider, $locationProvider) {
  $locationProvider.hashPrefix('');
  $routeProvider
    .when("/main", {
      templateUrl: "templates/main.html",
    })
    .when("/orders", {
      template: "<orders></orders>"
    })
    .when("/tradeRoutes", {
      template: "<tradeRoutes></tradeRoutes>"
    })
    .when("/search", {
      template: "<search></search>" 
    })
    .otherwise("/main");
});