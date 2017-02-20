const crest = require('./crest');
const sde = require('eve-online-sde');
const logger = require('../logger');
const stations = require('../static/stations');

class TradeFinder {

  findTradesInRegions(constraints) {
    const orderPromises = [];
    for (const regionId of constraints.regions) {
      let p = crest.getAllMarketOrders(regionId);
      orderPromises.push(p);
    }

    const buyOrders = new Map();
    const sellOrders = new Map();
    return Promise.all(orderPromises).then((ordersPerRegion) => {
      for (const regionOrders of ordersPerRegion) {
        // regionOrders is paged, so it's an array as well.
        logger.debug('%d pages found', regionOrders.length);
        this.addOrders(regionOrders, buyOrders, sellOrders);
      }
      logger.debug("Added sell orders for %d types", sellOrders.size);
      logger.debug("Added buy orders for %d types", buyOrders.size);
      return sde.types().then((types) => {
        return this.findTrades(buyOrders, sellOrders, constraints, types);
      });

    });
  }

  addOrders(regionOrders, buyOrders, sellOrders) {
    for (const ordersPage of regionOrders) {
      for (const order of ordersPage.items) {
        if (order.buy === true) {
          this.addOrder(order, buyOrders);
        } else {
          this.addOrder(order, sellOrders);
        }
      }
    }
  }

  addOrder(order, ordersMap) {
    let ordersArr = ordersMap.get(order.type);
    if (!ordersArr) {
      ordersArr = [];
      ordersMap.set(order.type, ordersArr);
    }
    ordersArr.push(order);
  }

  findTrades(buyOrders, sellOrders, constraints, types) {
    const trades = [];
    for (const buyEntry of buyOrders) {
      const typeId = buyEntry[0];
      const type = types[typeId];
      if (!type) {
        logger.warn('Unknown type %d', typeId);
        continue;
      }
      const buyOrdersArr = buyEntry[1];
      if (!sellOrders.has(typeId)) {
        continue;
      }
      const sellOrdersArr = sellOrders.get(typeId);

      const bestBuyOrder = buyOrdersArr.reduce((maxOrder, order) => order.price > maxOrder.price ? order : maxOrder, buyOrdersArr[0]);
      const bestSellOrder = sellOrdersArr.reduce((minOrder, order) => order.price < minOrder.price ? order : minOrder, sellOrdersArr[0]);

      if (bestSellOrder.price >= bestBuyOrder.price) {
        continue;
      }

      let maxProfit = 0;
      let maxProfitTrade = null;

      for (const buyOrder of buyOrdersArr) {
        for (const sellOrder of sellOrdersArr) {
          const priceDiff = buyOrder.price - sellOrder.price;
          if (priceDiff <= 0) {
            continue;
          }
          const maxUnits = Math.floor(constraints.maxCapacity / type.volume);
          const availableUnits = Math.min(buyOrder.volume, sellOrder.volume, maxUnits);

          const profit = availableUnits * priceDiff;
          if (profit < constraints.minProfit) {
            continue;
          }
          if (sellOrder.price * availableUnits > constraints.maxCash) {
            continue;
          }
          if (profit > maxProfit) {
            maxProfit = profit;
            maxProfitTrade = { buyOrder, sellOrder, profit, availableUnits, item: type };
          }
        }
      }
      if (maxProfitTrade != null) {
        trades.push(maxProfitTrade);
      }
    }
    this.addTradesMetaData(trades);
    const constraintsFilter = new ConstraintsFilter(constraints);
    const allowedTrades = trades.filter((e) => constraintsFilter.apply(e));
    allowedTrades.sort((left, right) => right.profit - left.profit);
    return allowedTrades;

  }

  addTradesMetaData(trades) {
    logger.info('Adding metadata to %d trades', trades.length);
    for (const trade of trades) {
      const buyOrderStation = stations[trade.buyOrder.stationID];
      const sellOrderStation = stations[trade.sellOrder.stationID];

      trade.buyOrder.station = buyOrderStation ? buyOrderStation.stationName : 'N/A';
      trade.sellOrder.station = sellOrderStation ? sellOrderStation.stationName : 'N/A';

      if (buyOrderStation && sellOrderStation) {
        let fromSystem = map.GetSystem({ name: sellOrderStation.systemName });
        let toSystem = map.GetSystem({ name: buyOrderStation.systemName });
        trade.route = map.Route(fromSystem.ID, toSystem.ID, [], true, false);
        trade.jumps = trade.route.length;
      }
    }
  }
}


class ConstraintsFilter {
  constructor(constraints = {}) {
    this.constraints = constraints;
  }

  apply(trade) {
    // Max Cash
    const neededCash = trade.availableUnits * trade.sellOrder.price;
    if (neededCash > this.constraints.maxCash) {
      logger.info('Filtering trade with high cash : %d (profit=%d)', neededCash, trade.profit);
      return false;
    }

    // Max jumps
    if (trade.jumps > this.constraints.maxJumps) {
      logger.info('Filtering trade with high jumps : %d (profit=%d)', trade.jumps, trade.profit);
      return false
    }

    // Max capacity
    if (!trade.item) {
      logger.info('Filtering trade because item is not available: %j', trade.type);
      return false;
    }
    const neededCapacity = trade.availableUnits * trade.item.volume;
    if (neededCapacity > this.constraints.maxCapacity) {
      logger.info('Filtering trade with high capacity : %d (profit=%d)', neededCapacity, trade.profit);
      return false;
    }

    return true;
  }
}
module.exports = new TradeFinder();