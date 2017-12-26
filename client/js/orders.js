walleApp.component('orders', {
    templateUrl: 'templates/orders.html',
    controller: function OrdersController($scope, $http, $route, $location, $anchorScroll) {

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
            $scope.buyChart.data = getChartData($scope.orders.buyOrders, 0.0, 0.95);
          }
          if ($scope.orders.sellOrders.length) {
            $scope.lowestSellOrder = $scope.orders.sellOrders[0].price;
            $scope.type = $scope.orders.buyOrders[0].type;
            $scope.sellChart.data = getChartData($scope.orders.sellOrders, 0.0, 0.95);
          }
          $scope.loader = false;
          console.log('', $scope.orders);
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
        const issuedDate = new Date(item + 'Z');
        const difference = moment().diff(issuedDate);
        return moment.duration(difference).humanize();
      };

      $scope.scrollTo = function (place) {
        $location.hash(place);
        $anchorScroll();
      };


      $scope.sellChart = {};
      $scope.sellChart.type = "Histogram";
      $scope.sellChart.data = [
        ['Label', 'Price']
      ];

      $scope.sellChart.options = {
        'title': 'Sell Prices'
      };

      $scope.buyChart = {};
      $scope.buyChart.type = "Histogram";
      $scope.buyChart.data = [
        ['Label', 'Price']
      ];

      $scope.buyChart.options = {
        'title': 'Buy Prices'
      };

      getChartData = function(orders, startPercentile = 0.0, endPercentile = 1.0) {
        var chartData = [
          ['Label', 'Price']
        ];
        var startIndex = Math.floor(orders.length * startPercentile);
        var endIndex = Math.floor(orders.length * endPercentile);
        for (var i = startIndex; i < endIndex; i++) {
          chartData.push(['', orders[i].price]);
        }
        return chartData;
      }

      $scope.selectedBuyOrder = null;
      $scope.selectedSellOrder = null;
      $scope.onSelect = function(order, buyOrSell) {
        if (order.selected === true) {
          // Select
          if (buyOrSell === 'buy') {
            if ($scope.selectedBuyOrder) {
              $scope.selectedBuyOrder.selected = false;
            }
            $scope.selectedBuyOrder = order;
          } else {
            if ($scope.selectedSellOrder) {
              $scope.selectedSellOrder.selected = false;
            }
            $scope.selectedSellOrder = order;
          }
        } else {
          // Deselect
          if (buyOrSell === 'buy') {
            if ($scope.selectedBuyOrder) {
              $scope.selectedBuyOrder.selected = false;
            }
            $scope.selectedBuyOrder = null;
          } else {
            if ($scope.selectedSellOrder) {
              $scope.selectedSellOrder.selected = false;
            }
            $scope.selectedSellOrder = null;
          }
        }
        $scope.refreshRoutes();
      }

      $scope.refreshRoutes = function() {
        if (!$scope.selectedSellOrder && !$scope.selectedBuyOrder) {
          return [];
        }
        const fromStations = $scope.selectedSellOrder ? [$scope.selectedSellOrder.location.id] : $scope.orders.sellOrders.map((item) => item.location.id);
        const toStations = $scope.selectedBuyOrder ? [$scope.selectedBuyOrder.location.id] : $scope.orders.buyOrders.map((item) => item.location.id);
        console.log("From stations ", fromStations);
        console.log("To stations ", toStations);
        
        return $http.post('/api/route', {fromStations, toStations}).then((result) => {
          console.log(result.data);
          // 
          return result.data;
        });
       
      }
    }
  }
).filter('diffToNow', () => {
  let now = new Date().getTime();
  return function (input) {
    let then = new Date(input).getTime();
    return (now - then) / (1000 * 60 * 60);
  }
});