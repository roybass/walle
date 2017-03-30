walleApp.component('trades', {
  templateUrl: 'templates/trades.html',
  controller: function TradesController($scope, $http) {

    $scope.sortField = 'profit';
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
      console.log("Refresh args : ", args);
      $scope.trades = [];
      $scope.loader = true;

      var url = '/api/bestTrades';
      var query = [];
      for (var key in args) {
        if (!args.hasOwnProperty(key) || !args[key]) {
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

    $scope.getStatsSize = function(podKills) {
      return Math.min(14, 8 + 1 * (podKills || 0)); 
    }
  }
});