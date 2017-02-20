const numeral = require('numeral');
const trade = require('./crest/trade');
const crest = require('./crest/crest');
const sde = require('eve-online-sde');
const logger = require('./logger');
const EVEoj = require("EVEoj");
const SDD = EVEoj.SDD.Create("json", { path: "SDD_Ascension_201611140" });

const constraints = {
  maxCash: 25000000, // Max available cash for trading
  maxJumps: 30, // Max jumps
  maxCapacity: 300, // Cubic meters avaiable for hauling

  regions: [10000042, 10000002, 10000043]
};


SDD.LoadMeta()
  .then(() => {
    map = EVEoj.map.Create(SDD, "K");
    return map.Load();
  })
  .then(() => {
    logger.info('Fetching orders for regions ', constraints.regions);
    return trade.findTradesInRegions(constraints.regions);
  })
  .then((trades) => {
    logger.info('Adding metadata to %d trades', trades.length);
    return addTradesMetaData(trades);
  })
  .then((trades) => {
    const constraintsFilter = new ConstraintsFilter(constraints);
    const allowedTrades = trades.filter((e) => constraintsFilter.apply(e));
    allowedTrades.sort((left, right) => right.profit - left.profit);
    logger.info('After filtering trades there are %d good trades', allowedTrades.length);

    logger.info('Top 10 Routes:');
    for (let i = 0; i < 10; i++) {
      const t = allowedTrades[i];
      logger.info('Trade %d: %s', i, JSON.stringify({
        buy: {
          price: t.sellOrder.price,
          units: t.sellOrder.volume,
          station: t.sellOrder.station
        },
        sell: {
          price: t.buyOrder.price,
          units: t.buyOrder.volume,
          station: t.buyOrder.station
        },
        type: {
          name: t.item.name.en,
          volume: t.item.volume
        },
        profit: numeral(t.profit).format('0,0'),
        profitPerJump: (Math.floor(t.profit / t.jumps)),
        availableUnits: t.availableUnits,
        jumps: t.jumps,
        totalVolume: t.availableUnits * t.item.volume
      }, null, ' '));
    }

    // Now let's find the best Round-Trip: (pairs of stations with accumulated profit)
    const rtTrades = new Map();
    for (const trade of allowedTrades) {
      const keyComponents = [trade.buyOrder.stationID, trade.sellOrder.stationID];
      keyComponents.sort();
      const key = keyComponents.join('_');
      let rtTradesArr = rtTrades.get(key);
      if (!rtTradesArr) {
        rtTradesArr = [];
        rtTrades.set(key, rtTradesArr);
      }
      rtTradesArr.push(trade);
    }

    let bestRtProfit = 0;
    let bestRtTrades = null;
    for (const rtTradesArr of rtTrades.values()) {
      const totalProfit = rtTradesArr.reduce((sum, trade) => sum + trade.profit, 0);
      if (totalProfit > bestRtProfit) {
        bestRtProfit = totalProfit;
        bestRtTrades = rtTradesArr;
      }
    }
    logger.info('Best Round Trip has profit : %d. Trades: %j', bestRtProfit, bestRtTrades);
  });


function addTradesMetaData(trades) {
  return trades.reduce((p, trade) => {
    return p.then(() => {
      const tradePromises = [];
      tradePromises.push(crest.getStation(trade.buyOrder.stationID));
      tradePromises.push(crest.getStation(trade.sellOrder.stationID));
      tradePromises.push(sde.lookupByID(trade.sellOrder.type));

      return Promise.all(tradePromises).then((results) => {
        trade.buyOrder.station = results[0] ? results[0].name : 'N/A';
        trade.sellOrder.station = results[1] ? results[1].name : 'N/A';
        trade.item = results[2];

        if (results[0] && results[0].system && results[1] && results[1].system) {
          let fromSystem = map.GetSystem({ name: results[1].system.name });
          let toSystem = map.GetSystem({ name: results[0].system.name });
          trade.route = map.Route(fromSystem.ID, toSystem.ID, [], true, false);
          trade.jumps = trade.route.length;
        }
      }).catch(reason => {
        logger.error(reason);
      });
    });
  }, Promise.resolve('')).then(() => trades);
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