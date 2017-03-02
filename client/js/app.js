var walleApp = angular.module('walleApp', ['ngTagsInput', 'ngNumeraljs']);

walleApp.component('constraints', {
  templateUrl: 'templates/constraints.html',
  controller: function ConstraintsController($scope, $http) {
    $scope.constraints = {
      maxCash: 30000000, // Max available cash for trading
      maxJumps: 10, // Max jumps
      maxCapacity: 5100, // Cubic meters available for hauling
      minProfit: 100000, // Minimum profit per trade (units * price diff)
      fromSystemRadius: 0, // Radius (in jumps) from the 'fromSystems' array.
      minSecurity: 0 // Minimum security status of from/to system.
    };

    $scope.refresh = function () {
      console.log("Emitting refresh");
      $scope.constraints.regions = $scope.regions.map((item) => item.text).join(',');
      $scope.constraints.fromSystems = $scope.systems.map((item) => item.text).join(',');
      $scope.$parent.$emit('refresh', $scope.constraints);
    };

    $scope.allRegions = function (query) {
      const lcaseQuery = query.toLowerCase();
      return $http.get('/api/regions').then((result) => {
        console.log(result);
        return result.data.filter((item) => item.toLowerCase().indexOf(lcaseQuery) >= 0).map((name) => {
          return { text: name }
        });
      });
    };

    $scope.allSystems = function (query) {
      const lcaseQuery = query.toLowerCase();
      return $http.get('/api/systems').then((result) => {
        console.log(result);
        return result.data.filter((item) => item.toLowerCase().indexOf(lcaseQuery) >= 0).map((name) => {
          return { text: name }
        });
      });
    };

    $scope.regions = [
      { text: 'Metropolis' },
      { text: 'Heimatar' },
      { text: 'Derelik' },
      { text: 'Molden Heath' }
    ];
    $scope.systems = [
      { text: 'Rens' }
    ];
  }
});


walleApp.component('trades', {
  templateUrl: 'templates/trades.html',
  controller: function TradesController($scope, $http) {

    $scope.sortField = 'profitPercent';
    $scope.sortOrder = true;
    $scope.setSortField = function(sortField) {
      $scope.previousSortField = $scope.sortField;
      $scope.sortField = sortField;
    };
    $scope.toggleOrder = function() {
      console.log($scope.previousSortField, $scope.sortField);
      if ($scope.previousSortField == $scope.sortField) {
        $scope.sortOrder = !$scope.sortOrder;
      } else {
        $scope.sortOrder = true;
      }
    };

    $scope.$parent.$on('refresh', function (event, args) {
      $scope.trades = [];
      $scope.loader = true;

      var url = '/api/bestTrades';
      var query = [];
      for (var key in args) {
        if (!args.hasOwnProperty(key)) {
          continue;
        }
        query.push(key + '=' + args[key]);
      }
      if (query.length > 0) {
        url += '?' + query.join('&');
      }
      $http.get(url).then(function (result) {
        $scope.loader = false;
        $scope.trades = result.data;
        console.log(result.data);
      });
    });

    $scope.getSecurityColor = function (security) {
      if (security >= 1) return '#2FEFEF';
      if (security >= 0.9) return '#48F0C0';
      if (security >= 0.8) return '#00EF47';
      if (security >= 0.7) return '#00F000';
      if (security >= 0.6) return '#8FEF2F';
      if (security >= 0.5) return '#EFEF00';
      if (security >= 0.4) return '#D77700';
      if (security >= 0.3) return '#F06000';
      if (security >= 0.2) return '#F04800';
      if (security >= 0.1) return '#F00000';
      return '#F00000';
    };

    $scope.$parent.$emit('refresh', {});
  }
});