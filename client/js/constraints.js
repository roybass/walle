walleApp.component('constraints', {
  templateUrl: 'templates/constraints.html',
  controller: function ConstraintsController($scope, $http, $route, FileDialog) {

    const params = $route.current.params;

    $scope.constraints = {
      maxCash: params['maxCash'] || 1000000000, // Max available cash for trading
      maxJumps: params['maxJumps'] || 30, // Max jumps
      maxCapacity: params['maxCapacity'] || 10000, // Cubic meters available for hauling
      minProfit: params['minProfit'] || 10000000, // Minimum profit per trade (units * price diff)
      fromSystemRadius: params['fromSystemRadius'] || 0, // Radius (in jumps) from the 'fromSystems' array.
      minSecurity: params['minSecurity'] || 0, // Minimum security status of from/to system.
      shipType: params['shipType'] || 'frigate',
      maxWarpSpeed: params['maxWarpSpeed'] || 4.5,
      alignTime: params['alignTime'] || 8,
      avoidLowSec : params['avoidLowSec'] || false
    };

    $scope.refresh = function () {
      console.log("Emitting refresh");
      $scope.constraints.regions = fromTagsInput($scope.regions);
      $scope.constraints.fromSystems = fromTagsInput($scope.fromSystems);
      $scope.constraints.toSystems = fromTagsInput($scope.toSystems);
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
    $scope.regions = toTagsInput(params['regions'] || '');
    $scope.fromSystems = toTagsInput(params['fromSystems'] || '');
    $scope.toSystems = toTagsInput(params['toSystems'] || '');

    function toTagsInput(str) {
      if (!str) {
        return null;
      }
      return str.split(',').map((item) => {
        return {
          text: item
        }
      })
    }

    function fromTagsInput(input) {
      if (!input) {
        return '';
      }
      return input.map((item) => item.text).join(',');
    }

    $scope.loadFile = function() {
      FileDialog.open({}, function(file) {
        var reader = new FileReader();
        reader.onload = function(data) {
          console.log(data.target.result);
          var newConstraints = JSON.parse(data.target.result);
          $scope.$apply(function() {
            $scope.constraints = newConstraints;
            $scope.regions = toTagsInput(newConstraints.regions);
            $scope.fromSystems = toTagsInput(newConstraints.fromSystems);
            $scope.toSystems = toTagsInput(newConstraints.toSystems);
          });
          
        }
        reader.readAsText(file);
      });
    }

    $scope.saveFile = function() {
      console.log("Saving to file");
      $scope.constraints.regions = fromTagsInput($scope.regions);
      $scope.constraints.fromSystems = fromTagsInput($scope.fromSystems);
      $scope.constraints.toSystems = fromTagsInput($scope.toSystems);

      $scope.download('walle.json', JSON.stringify($scope.constraints));
    }

    $scope.download = function(filename, text) {
      var pom = document.createElement('a');
      pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      pom.setAttribute('download', filename);

      if (document.createEvent) {
          var event = document.createEvent('MouseEvents');
          event.initEvent('click', true, true);
          pom.dispatchEvent(event);
      }
      else {
          pom.click();
      }
    }

    $scope.shipTypes = [
      { id: 'titan', label: 'Titan' },
      { id: 'freighter', label: 'Freighter' },
      { id: 'caps', label: 'Caps' },
      { id: 'battleship', label: 'Battleship' },
      { id: 'battleship2', label: 'Battleship II' },
      { id: 'battlecruiser', label: 'Battle Cruiser' },
      { id: 'capitalship', label: 'Capital Ship' },
      { id: 'industrial', label: 'Industrial' },
      { id: 'destroyer', label: 'Destroyer' },
      { id: 'assaultfrigate', label: 'Assault Frigate' },
      { id: 'blockaderunner', label: 'Blockade Runner' },
      { id: 'interceptor', label: 'Interceptor' },
      { id: 'frigate', label: 'Frigate' },
      { id: 'cruiser', label: 'Cruiser' },
      { id: 'cruiser2', label: 'Cruiser II' }
    ];
  }

});