const numeral = require('numeral');
const trade = require('./crest/trade');
const regions = require('./static/regions');
const systems = require('./static/systems');
const routesCalc = require('./crest/route_calculator');
const logger = require('./logger');

const constraints = {
  maxCash: 15000000, // Max available cash for trading
  maxJumps: 15, // Max jumps
  maxCapacity: 5000, // Cubic meters available for hauling
  minProfit: 100000, // Minimum profit per trade (units * price diff)
  regions: ['Heimatar', 'Metropolis', 'Molden Heath', 'Derelik'].map(regions.getId), // Region Ids included in the search
  fromSystems: ['Hek'].map(systems.nameToId),
  fromSystemRadius: 3, // Not implemented. Radius (in jumps) from the 'fromSystems' array.
  minSecurity: -1 // Minimum security status of from/to system.
};


routesCalc.init()
  .then((routesCalculator) => {
    logger.info('Fetching orders for regions ', constraints.regions);
    return trade.findTradesInRegions(constraints, routesCalculator);
  })
  .then((trades) => {
    logger.info('Found %d good trades', trades.length);

    logger.info('Top 10 Routes:');
    for (let i = 0; i < 10; i++) {
      logger.info('Trade %d: %s', i, JSON.stringify(formatTrade(trades[i]), null, ' '));
    }
  });

function formatTrade(t) {
  if (t === undefined) {
    return {};
  }
  return {
    buy: {
      price: numeral(t.sellOrder.price).format('0,0'),
      units: t.sellOrder.volume,
      station: t.sellOrder.station
    },
    sell: {
      price: numeral(t.buyOrder.price).format('0,0'),
      units: t.buyOrder.volume,
      station: t.buyOrder.station
    },
    type: !t.type ? 'N/A' : {
      name: t.type.name.en,
      volume: t.type.volume
    },
    profit: numeral(t.profit).format('0,0'),
    profitPerJump: (Math.floor(t.profit / t.jumps)),
    profitPercent: numeral(t.profit / (t.tradeUnits * t.sellOrder.price)).format('0.00%'),
    units: t.tradeUnits,
    jumps: t.jumps,
    totalVolume: t.item ? t.tradeUnits * t.item.volume : 'N/A'
  };
}