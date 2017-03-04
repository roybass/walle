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