const crest = require('./crest');
const logger = require('../logger');

class TradeFinder {

  findTradesInRegions(regionIds = [], constraints = {}) {
    const orderPromises = [];
    for (const regionId of regionIds) {
      var p = crest.getAllMarketOrders(regionId);
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
      return this.findTrades(buyOrders, sellOrders, constraints);
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

  findTrades(buyOrders, sellOrders, constraints) {
    const trades = [];
    for (const buyEntry of buyOrders) {
      const type = buyEntry[0];
      const buyOrdersArr = buyEntry[1];
      if (!sellOrders.has(type)) {
        continue;
      }
      const sellOrdersArr = sellOrders.get(type);

      //buyOrdersArr.sort((left, right) => right.price - left.price);
      //sellOrdersArr.sort((left, right) => left.price - right.price);

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
          const availableUnits = Math.min(buyOrder.volume, sellOrder.volume);
          const profit = availableUnits * priceDiff;
          if (profit > maxProfit) {
            maxProfit = profit;
            maxProfitTrade = { buyOrder, sellOrder, profit, availableUnits };
          }
        }
      }
      if (maxProfitTrade != null) {
        trades.push(maxProfitTrade);
      }
    }
    return trades;
  }
}

module.exports = new TradeFinder();