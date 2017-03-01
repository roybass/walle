var walleApp = angular.module('walleApp', ['ngTagsInput']);

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

    $scope.allSystems = function(query) {
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

    $scope.$parent.$emit('refresh', {});
  }
});