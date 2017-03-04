const crest = require('./crest/crest');
const sde = require('eve-online-sde');
const logger = require('../logger');
const stations = require('../static/stations');
const systems = require('../static/systems');

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
        logger.debug('%d pages found for %s', regionOrders.data.length, regionOrders.regionId);
        this.addOrders(regionOrders.data, buyOrders, sellOrders);
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
      if (!ordersPage.items) {
        logger.error("No pages found in order object");
        continue;
      }
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
    const pairs = new Set();
    const trades = [];
    let all = 0;
    for (const buyEntry of buyOrders) {
      const typeId = buyEntry[0];
      const type = types[typeId];
      if (!type) {
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

      const potentialTrades = [];
      for (const sellOrder of sellOrdersArr) {
        all++;
        if (sellOrder.price > buyOrdersArr[0]) {
          break; // No point in checking anymore pairs - we reached a point where seller price is higher than buyer price
        }
        sellOrder.station = this.getStationInfo(sellOrder.stationID);
        if (!sellOrder.station) {
          continue; // No station, we can't calculate distance etc.
        }
        if (sellOrder.station.security < constraints.minSecurity) {
          continue; // Too dangerous...
        }
        if (constraints.fromSystems && !constraints.fromSystems.has(sellOrder.station.systemId)) {
          continue; // We have a 'from system' constraint and it doesn't match
        }
        for (const buyOrder of buyOrdersArr) {
          buyOrder.station = this.getStationInfo(buyOrder.stationID);
          if (!buyOrder.station) {
            continue; // No station, we can't calculate distance etc.
          }
          if (buyOrder.station.security < constraints.minSecurity) {
            continue; // Too dangerous..
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
          potentialTrades.push({ profit, buyOrder, sellOrder, tradeUnits, type, typeId });
        }
      }
      potentialTrades.sort((a, b) => b.profit - a.profit);
      for (let trade of potentialTrades) {
        const route = routesCalculator.getRoute(trade.sellOrder.station.systemId, trade.buyOrder.station.systemId, true);
        if (route.length > constraints.maxJumps) {
          continue;
        }
        trade.route = route;
        trade.jumps = route.length;
        trades.push(trade);
        break;
      }
    }
    logger.info('Scanned %d possible trades', all);
    logger.info('%d station pairs', pairs.size);
    trades.sort((left, right) => right.profit - left.profit);

    return trades;

  }

  getStationInfo(stationID) {
    let station = stations[stationID];
    if (!station) {
      return null;
    }
    const stationInfo = {
      name: station.stationName,
      region: station.regionName,
      system: station.systemName,
      systemId: station.systemId
    };

    let system = systems.findById(station.systemId);
    if (system) {
      stationInfo.security = system.security;
    }
    return stationInfo;
  }
}

module.exports = new TradeFinder();