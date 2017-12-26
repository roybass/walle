const crest = require('./crest/crest');
const sde = require('eve-online-sde');
const regions = require('../static/regions');
const stations = require('../static/stations');
const logger = require('../logger');

class OrdersFinder {
  findProfitableOrders(type) {
    const orderPromises = [];
    for (const regionId of regions.getAllRegionIds()) {
      let p = crest.getMarketOrdersForType(regionId, type, false);
      orderPromises.push(p);
    }


    let buyOrders = [];
    let sellOrders = [];
    return Promise.all(orderPromises).then((ordersPerRegion) => {
      for (const regionOrders of ordersPerRegion) {
        // regionOrders is paged, so it's an array as well.
        logger.debug('%d pages found for %s', regionOrders.buyOrders.length, regionOrders.regionId);
        buyOrders = this.addAll(regionOrders.buyOrders, buyOrders);
        sellOrders = this.addAll(regionOrders.sellOrders, sellOrders);
      }
      logger.debug("Added %d sell orders", sellOrders.length);
      logger.debug("Added %d buy orders", buyOrders.length);

      buyOrders.sort((left, right) => right.price - left.price);
      sellOrders.sort((left, right) => left.price - right.price);

      const stationToRegion = (item) => {
        const station = stations[item.location.id];
        if (station) {
          item.region = station.regionName;
        }
      };

      buyOrders.forEach(stationToRegion);
      sellOrders.forEach(stationToRegion);
      return {
        sellOrders,
        buyOrders
      };
    });
  }

  addAll(pagedData, ordersArr) {
    let res = ordersArr.concat([]);
    for (let page of pagedData) {
      res = res.concat(page.items);
    }
    return res;
  }
}

module.exports = new OrdersFinder();