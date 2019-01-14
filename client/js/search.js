walleApp.component('search', {
  templateUrl: 'templates/search.html',
	controller: function SearchController($scope, $http, $route, $window) {

		$scope.limit = parseInt($route.current.params['limit'] || '100');
		$scope.offset = parseInt($route.current.params['offset'] || '0');
		$scope.typeName = $route.current.params['q'] || '';
		$scope.loading = false;
		$scope.data = [];
		$scope.sortField = 'group';
		$scope.previousSortField = '';

		$scope.go = function() {
			$window.location.href = `#/search?q=${$scope.typeName}`;
		}

		$scope.doSearch = function() {
			$scope.loading = true;
			$http.get(`api/search?q='${$scope.typeName}&limit=${$scope.limit}&offset=${$scope.offset}`).then(function (result) {
		     	$scope.data = result.data;
		     	$scope.loading = false;
		    });
		}
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

	   	if ($scope.typeName !== '') {
			$scope.doSearch();
		}
		
	}
});
