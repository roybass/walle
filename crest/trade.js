const crest = require('./crest');
const sde = require('eve-online-sde');
const logger = require('../logger');
const stations = require('../static/stations');

const pairs = new Set();
class TradeFinder {

  findTradesInRegions(constraints, routesCalculator) {
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
        return this.findTrades(buyOrders, sellOrders, constraints, types, routesCalculator);
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

  findTrades(buyOrders, sellOrders, constraints, types, routesCalculator) {
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

      buyOrdersArr.sort((left, right) => right.price - left.price);
      sellOrdersArr.sort((left, right) => left.price - right.price);

      if (sellOrdersArr[0].price >= buyOrdersArr[0].price) {
        continue; // Best sell order is smaller than best buy order - forget about this type
      }
      if (sellOrdersArr[0] > constraints.maxCash) {
        continue; // Too expensive.
      }

      let maxProfit = 0;
      let maxProfitTrade = null;

      for (const sellOrder of sellOrdersArr) {
        if (sellOrder.price > buyOrdersArr[0]) {
          break; // No point in checking anymore pairs - we reached a point where seller price is higher than buyer price
        }
        const sellOrderStation = stations[sellOrder.stationID];
        if (!sellOrderStation) {
          continue; // No station, we can't calculate distance etc.
        }
        if (constraints.fromSystems && this.findSystem(constraints, sellOrderStation.systemId) == null) {
          continue; // We have a 'from system' constraint and it doesn't match
        }
        for (const buyOrder of buyOrdersArr) {
          const buyOrderStation = stations[buyOrder.stationID];
          if (!buyOrderStation) {
            continue; // No station, we can't calculate distance etc.
          }

          const priceDiff = buyOrder.price - sellOrder.price;
          if (priceDiff <= 0) {
            break;
          }
          const maxUnits = Math.floor(constraints.maxCapacity / type.volume);
          const minUnits = Math.max(buyOrder.minVolume, sellOrder.minVolume); // The higher min-volume wins
          if (maxUnits < minUnits) {
            continue; // Not enough capacity for this deal
          }
          const availableUnits = Math.min(buyOrder.volume, sellOrder.volume);
          if (availableUnits < minUnits) {
            continue;
          }
          const tradeUnits = Math.min(availableUnits, maxUnits);

          const profit = tradeUnits * priceDiff;
          if (profit < constraints.minProfit) {
            continue;
          }
          if (sellOrder.price * tradeUnits > constraints.maxCash) {
            continue;
          }
          pairs.add(buyOrder.stationID + '_' + sellOrder.stationID);
          const route = routesCalculator.getRoute(sellOrderStation.systemId, buyOrderStation.systemId, true);
          if (route.length > constraints.maxJumps) {
            continue;
          }

          if (profit > maxProfit) {
            maxProfit = profit;
            maxProfitTrade = { buyOrder, sellOrder, profit, tradeUnits, item: type };
          }
        }
      }
      if (maxProfitTrade != null) {
        trades.push(maxProfitTrade);
      }
    }
    logger.info('%d station pairs', pairs.size);
    this.addTradesMetaData(trades, routesCalculator);
    const constraintsFilter = new ConstraintsFilter(constraints);
    const allowedTrades = trades.filter((e) => constraintsFilter.apply(e));
    allowedTrades.sort((left, right) => right.profit - left.profit);
    return allowedTrades;

  }

  addTradesMetaData(trades, routesCalculator) {
    logger.info('Adding metadata to %d trades', trades.length);
    for (const trade of trades) {
      const buyOrderStation = stations[trade.buyOrder.stationID];
      const sellOrderStation = stations[trade.sellOrder.stationID];

      trade.buyOrder.station = buyOrderStation ? buyOrderStation.stationName : 'N/A';
      trade.sellOrder.station = sellOrderStation ? sellOrderStation.stationName : 'N/A';

      if (buyOrderStation && sellOrderStation) {
        trade.route = routesCalculator.getRoute(sellOrderStation.systemId, buyOrderStation.systemId, true);
        trade.jumps = trade.route.length;
      }
    }
  }

  findSystem(constraints, filterSystem) {
    for (const system of constraints.fromSystems) {
      if (system === filterSystem) {
        return system;
      }
    }
    return null;
  }

}


class ConstraintsFilter {
  constructor(constraints = {}) {
    this.constraints = constraints;
  }

  apply(trade) {
    // Max Cash
    const neededCash = trade.tradeUnits * trade.sellOrder.price;
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
    const neededCapacity = trade.tradeUnits * trade.item.volume;
    if (neededCapacity > this.constraints.maxCapacity) {
      logger.info('Filtering trade with high capacity : %d (profit=%d)', neededCapacity, trade.profit);
      return false;
    }

    return true;
  }
}
module.exports = new TradeFinder();