walleApp.component('traderoutes', {
  templateUrl: 'templates/tradeRoutes.html',
	controller: function TradeRoutesController($scope, $http) {

		$scope.constraints = {
			fromSystem: "30000142",
			toSystem: "30002510",
			maxCash: 500000000,
			maxCapacity: 10000
		};

		$scope.systemsArr = [
			{ 
				id: 30000142,
				name: "Jita"
			},
			{ 
				id: 30002510,
				name: "Rens"
			},
			{
				id: 30002659,
				name: "Dodixie"
			}
		];

		$scope.systems = function() {
			return $scope.systemsArr;
		};

		$scope.refresh = function() {
      $scope.trades = [];
      $scope.loader = true;
      var url = '/api/tradeRoute';
      var query = [];
      const args = {
      	fromSystem : $scope.constraints.fromSystem,
      	toSystem : $scope.constraints.toSystem,
      	maxCash : $scope.constraints.maxCache,
      	maxCapacity : $scope.constraints.maxCapacity
      };

      for (var key in args) {
        if (!args.hasOwnProperty(key) || args[key] == null) {
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
    };

	}
});