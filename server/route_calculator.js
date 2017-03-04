const EVEoj = require("EVEoj");
const NodeCache = require('node-cache');

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

  constructor(map) {
    this.cache = new NodeCache({ stdTTL: 60 * 60 * 1000, checkperiod: 60 * 60 * 1000 });
    this.map = map;
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

  _calcRoute(fromStationId, toStationId, avoidLowSec) {
    return this.map.Route(fromStationId, toStationId, [], avoidLowSec, false);
  }
}

module.exports = {
  init
};

