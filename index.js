const numeral = require('numeral');
const trade = require('./crest/trade');
const regions = require('./static/regions');
const logger = require('./logger');
const EVEoj = require("EVEoj");
const SDD = EVEoj.SDD.Create("json", { path: "SDD_Ascension_201611140" });

const constraints = {
  maxCash: 15000000, // Max available cash for trading
  maxJumps: 30, // Max jumps
  maxCapacity: 5000, // Cubic meters available for hauling
  minProfit: 5000, // Minimum profit per trade (units * price diff)
  regions: ['The Forge', 'Domain', 'Metropolis'].map(regions.getId) // Region Ids included in the search
};


SDD.LoadMeta()
  .then(() => {
    map = EVEoj.map.Create(SDD, "K");
    return map.Load();
  })
  .then(() => {
    logger.info('Fetching orders for regions ', constraints.regions);
    return trade.findTradesInRegions(constraints);
  })
  .then((trades) => {
    logger.info('Found %d good trades', trades.length);

    logger.info('Top 10 Routes:');
    for (let i = 0; i < 10; i++) {
      logger.info('Trade %d: %s', i, JSON.stringify(formatTrade(trades[i]), null, ' '));
    }

    // Now let's find the best Round-Trip: (pairs of stations with accumulated profit)
    const rtTrades = new Map();
    for (const trade of trades) {
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
    bestRtTrades.sort((t1, t2) => t1.sellOrder.stationID - t2.sellOrder.stationID);
    logger.info('Best Round Trip has profit : %d. Trades:', bestRtProfit);
    for (const trade of bestRtTrades) {
      //logger.info('%s', JSON.stringify(formatTrade(trade), null, ' '));
    }
  });

function formatTrade(t) {
  return {
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
    type: !t.item ? 'N/A' : {
      name: t.item.name.en,
      volume: t.item.volume
    },
    profit: numeral(t.profit).format('0,0'),
    profitPerJump: (Math.floor(t.profit / t.jumps)),
    availableUnits: t.availableUnits,
    jumps: t.jumps,
    totalVolume: t.item ? t.availableUnits * t.item.volume : 'N/A'
  };
}