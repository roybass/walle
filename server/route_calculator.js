const path = require('path');
const EVEoj = require("EVEoj");
const NodeCache = require('node-cache');
const fs = require('fs');

const SDD = EVEoj.SDD.Create("json", { path: "SDD_Ascension_201611140" });

function init() {
  return SDD.LoadMeta()
    .then(() => {
      const map = EVEoj.map.Create(SDD, "K");
      return map.Load().then(() => map);
    })
    .then((map) => {
      return new RouteCalculatorWithCache(map);
    });
}

class RouteCalculatorWithCache {

  constructor(map, socket) {
    this.cache = new NodeCache({ stdTTL: 60 * 60 * 1000, checkperiod: 60 * 60 * 1000 });
    this.map = map;

    try {
      this.systemsItems = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'static', 'systemItems.json')));
      this.shipsConstants = require('../static/shipsConstants.json');
    } catch (e) {}
  }

  getRoute(fromSystemId, toSystemId, avoidLowSec) {
    const key = fromSystemId + '_' + toSystemId + '_' + avoidLowSec;
    let route = this.cache.get(key);
    if (!route) {
      route = this._calcRoute(fromSystemId, toSystemId, avoidLowSec);
      this.cache.set(key, route);
    }
    return route
  }

  getRouteTime(trade, constraints) {
    let duration = 0;
    const route = trade.route;
    const sellStation = trade.sellOrder.station;
    const buyStation = trade.buyOrder.station;

    for (let i = 0; i < route.length; i++) {
      let currentStargate, destinationStargate, gates;

      if (this.systemsItems.hasOwnProperty(route[i])) {
        const current = this.systemsItems[route[i]];

        if (i === 0) {
          gates = this._matchStargate(current.stargates, [route[i+1]]);
          destinationStargate = gates[0];

          if (destinationStargate)
            duration += this._getWarpTime(sellStation.position, destinationStargate.position, constraints);
        }
        else if (i == route.length - 1) {
          gates = this._matchStargate(current.stargates, [route[i-1]]);
          destinationStargate = gates[0];

          if (destinationStargate)
            duration += this._getWarpTime(buyStation.position, destinationStargate.position, constraints);
        }
        else {
          gates = this._matchStargate(current.stargates, [route[i-1], route[i+1]]);
          currentStargate = gates[0];
          destinationStargate = gates[1];

          if (currentStargate && destinationStargate)
            duration += this._getWarpTime(currentStargate.position, destinationStargate.position, constraints);
        }
      } else {
        return null;
      }
    }

    return duration;
  }

  _getStargate(stargateId, systemId) {
    if (this.systemsItems.hasOwnProperty(systemId)) {
      if (this.systemsItems[systemId].stargates.hasOwnProperty(stargateId)) {
        return this.systemsItems[systemId].stargates[stargateId];
      }
    }

    return null;
  }

  _matchStargate(stargates, route) {
    let processed = 0;
    const gates = new Array(route.length);

    for (const stargateId in stargates) {
      if (stargates.hasOwnProperty(stargateId)) {
        const stargate = stargates[stargateId];
        const idx = route.indexOf(stargate.destination.system.id);

        if (idx >= 0) {
          gates[idx] = this._getStargate(stargate.id, stargate.system.id);
          processed++;
        }

        if (processed >= route.length)
          break;
      }
    }

    return gates;
  }

  _getWarpTime(sPos, dPos, constraints) {
    const warpSpeed = constraints.maxWarpSpeed;
    const auToMeter = 149597870700;
    const alignTime = constraints.alignTime;
    const gate = 8;
    const k = this.shipsConstants[constraints.shipType];
    let duration = 0;
    if (!sPos || !dPos) {
      return duration;
    }

    const totalDistance = Math.sqrt( Math.pow((dPos.x - sPos.x), 2) + Math.pow((dPos.y - sPos.y), 2) + Math.pow((dPos.z - sPos.z), 2) );
    const accelerationTime = Math.log((warpSpeed * auToMeter) / k.acceleration) / k.acceleration;
    const decelerationTime = Math.log((warpSpeed * auToMeter) / k.deceleration) / k.deceleration;
    const accelerationDistance = Math.exp(accelerationTime * k.acceleration);
    const decelerationDistance = Math.exp(decelerationTime * k.deceleration);
    const distance = totalDistance - accelerationDistance - decelerationDistance;
    const shipSpeed = warpSpeed * auToMeter;

    duration += accelerationTime + decelerationTime;
    duration += distance / shipSpeed;
    duration += alignTime;
    duration += gate;

    return duration;
  }

  _calcRoute(fromStationId, toStationId, avoidLowSec) {
    return this.map.Route(fromStationId, toStationId, [], avoidLowSec, false);
  }
}

module.exports = {
  init
};

