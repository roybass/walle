var walleApp = angular.module('walleApp', []);

walleApp.component('constraints', {
  templateUrl: 'templates/constraints.html',
  controller: function ConstraintsController($scope) {
    $scope.constraints = {
      maxCash: 30000000, // Max available cash for trading
      maxJumps: 10, // Max jumps
      maxCapacity: 5100, // Cubic meters available for hauling
      minProfit: 100000, // Minimum profit per trade (units * price diff)
      regions: 'Metropolis, Heimatar, Derelik, Molden Heath', // Region names included in the search
      fromSystems: 'Rens',
      fromSystemRadius: 0, // Radius (in jumps) from the 'fromSystems' array.
      minSecurity: 0 // Minimum security status of from/to system.
    };

    $scope.refresh = function() {
      console.log("Emitting refresh");
      $scope.$parent.$emit('refresh', $scope.constraints);
    }
  }
});


walleApp.component('trades', {
  templateUrl: 'templates/trades.html',
  controller: function TradesController($scope, $http) {

    $scope.$parent.$on('refresh', function(event, args) {
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

    $scope.getLoader = function() {
      var loaders = [
        'http://bestanimations.com/Music/Dancers/happy-dance/happy-dance-animated-gif-image-1-2.gif',
        'https://media.giphy.com/media/12PRIhZ7sPNMEE/giphy.gif',
        'https://s-media-cache-ak0.pinimg.com/originals/c3/f4/fb/c3f4fbb1ec2baa386a73a8ef514e2edd.gif',
        'https://i.imgur.com/i6eXrfS.gif',
        'https://s-media-cache-ak0.pinimg.com/originals/72/46/7e/72467e84661bddcf4dafa30b94e1c35f.gif',
        'https://s-media-cache-ak0.pinimg.com/originals/5d/12/10/5d121032b495b825b272b10d0c88a0bd.gif',
        'https://s-media-cache-ak0.pinimg.com/originals/2e/41/57/2e4157a3a0a4734f497eaad95e6071a8.gif'
      ];
      return loaders[Math.floor(Math.random() * loaders.length)];
    };

    $scope.$parent.$emit('refresh', {});
  }
});