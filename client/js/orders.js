walleApp.component('orders', {
    templateUrl: 'templates/orders.html',
    controller: function OrdersController($scope, $http, $route, $window) {

      $scope.typeId = $route.current.params['type'] || null;
      $scope.type = {};
      $scope.orders = {};
      $scope.loader = false;
      $scope.highestBuyOrder = 0.0;
      $scope.lowestSellOrder = 0.0;
      $scope.showAll = false;

      $scope.goToOrders = function() {
        $window.location.href = `#/orders?type=${$scope.typeId}`;
      };


      $scope.loadOrders = function() {
        $scope.loader = true;
        $http.get(`/api/orders/${$scope.typeId}`)
          .then((res) => {
            $scope.orders = res.data;
            if ($scope.orders.buyOrders.length) {
              $scope.highestBuyOrder = $scope.orders.buyOrders[0].price;
              $scope.type = $scope.orders.type;
            }
            if ($scope.orders.sellOrders.length) {
              $scope.lowestSellOrder = $scope.orders.sellOrders[0].price;
              $scope.type = $scope.orders.type;
            }
            $scope.chartData.data = getChartDataForAll($scope.orders.sellOrders, $scope.orders.buyOrders);
            $scope.loader = false;
          });        
      };

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
        const issuedDate = new Date(item);
        const difference = moment().diff(issuedDate);
        return moment.duration(difference).humanize();
      };

      $scope.scrollTo = function (id) {
          document.getElementById(id).scrollIntoView();
      };

      $scope.chartData = {};
      $scope.chartData.type = "Histogram";

      $scope.chartData.options = {
        title: 'Prices',
        histogram: { lastBucketPercentile: 2 },
        hAxis: {slantedText: true}
      };
      $scope.chartData.data = [
        ['Buy Price', 'Sell Price']
      ];

      getChartDataForAll = function(sellOrders, buyOrders, startPercentile = 0.0, endPercentile = 1.0) {
        var chartData = [
           ['Buy Price', 'Sell Price']
        ];
        const sellData = this.getChartData(sellOrders, 0.0, 0.98);
        const buyData = this.getChartData(buyOrders, 0.0, 0.98);
        sellData.forEach(item => {chartData.push([null, item])});
        buyData.forEach(item => {chartData.push([item, null])});
        console.log('chartData = ', chartData);
        return chartData;
      }

      getChartData = function(orders, startPercentile = 0.0, endPercentile = 1.0) {
        var chartData = [];
        var startIndex = Math.floor(orders.length * startPercentile);
        var endIndex = Math.floor(orders.length * endPercentile);
        for (var i = startIndex; i < endIndex; i++) {
          chartData.push(orders[i].price);
        }
        return chartData;
      }

      if ($scope.typeId !== null) {
        $scope.loadOrders();
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