walleApp.component('orders', {
    templateUrl: 'templates/orders.html',
    controller: function OrdersController($scope, $http, $route) {

      const typeId = $route.current.params['type'];

      $scope.type = {};
      $scope.orders = {};
      $scope.loader = true;
      $scope.highestBuyOrder = 0.0;
      $scope.lowestSellOrder = 0.0;
      $scope.showAll = false;

      $http.get(`/api/orders/${typeId}`)
        .then((res) => {
          $scope.orders = res.data;
          if ($scope.orders.buyOrders.length) {
            $scope.highestBuyOrder = $scope.orders.buyOrders[0].price;
            $scope.type = $scope.orders.buyOrders[0].type;
          }
          if ($scope.orders.sellOrders.length) {
            $scope.lowestSellOrder = $scope.orders.sellOrders[0].price;
            $scope.type = $scope.orders.buyOrders[0].type;
          }
          $scope.loader = false;
        });

      $scope.buyFilter = function (item) {
        if ($scope.showAll) {
          return true;
        }
        return item['price'] > $scope.lowestSellOrder;
      };

      $scope.sellFilter = function (item) {
        if ($scope.showAll) {
          return true;
        }
        return item['price'] < $scope.highestBuyOrder;
      };

      $scope.diffToNow = function (item) {
        console.log(item);
      };
    }
  }
).filter('diffToNow', () => {
  let now = new Date().getTime();
  return function (input) {
    let then = new Date(input).getTime();
    return (now - then) / (1000 * 60 * 60);
  }
});