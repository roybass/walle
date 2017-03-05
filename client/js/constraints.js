walleApp.component('constraints', {
  templateUrl: 'templates/constraints.html',
  controller: function ConstraintsController($scope, $http, $route) {

    const params = $route.current.params;
    $scope.constraints = {
      maxCash: params['maxCash'] || 30000000, // Max available cash for trading
      maxJumps: params['maxJumps'] || 10, // Max jumps
      maxCapacity: params['maxCapacity'] || 5100, // Cubic meters available for hauling
      minProfit: params['minProfit'] || 100000, // Minimum profit per trade (units * price diff)
      fromSystemRadius: params['fromSystemRadius'] || 0, // Radius (in jumps) from the 'fromSystems' array.
      minSecurity: params['minSecurity'] || 0 // Minimum security status of from/to system.
    };

    $scope.refresh = function () {
      console.log("Emitting refresh");
      $scope.constraints.regions = $scope.regions.map((item) => item.text).join(',');
      $scope.constraints.fromSystems = $scope.systems.map((item) => item.text).join(',');
      //  $route.updateParams($scope.constraints);
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

    $scope.regions = (params['regions'] || 'Metropolis, Heimatar, Derelik, Model Heath').split(',').map((item) => {
      return {
        text: item
      }
    });


    $scope.systems = (params['systems'] || 'Rens').split(',').map((item) => {
      return {
        text: item
      }
    });
  }
});