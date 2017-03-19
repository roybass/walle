const numeral = require('numeral');
const trade = require('./server/trade');
const routesCalc = require('./server/route_calculator');
const constraintsFactory = require('./server/constraints_factory');
const logger = require('./logger');

const constraints = {
  maxCash: 30000000, // Max available cash for trading
  maxJumps: 10, // Max jumps
  maxCapacity: 5100, // Cubic meters available for hauling
  minProfit: 100000, // Minimum profit per trade (units * price diff)
  regions: 'Metropolis, Heimatar, Derelik, Molden Heath', // Region names included in the search
  fromSystems: 'Rens',
  fromSystemRadius: 2, // Radius (in jumps) from the 'fromSystems' array.
  toSystems: null,
  minSecurity: 0, // Minimum security status of from/to system.
  tax: 0.02, // VAT..  usually 2%.
  maxSpeed: 150, // Max ship speed
  maxWarpSpeed: 3, // Max ship warp speed
  alignTime: 5 // Ship align time
};


routesCalc.init()
  .then((routesCalculator) => {
    logger.info('Fetching orders for regions ', constraints.regions);
    return trade.findTradesInRegions(constraintsFactory.prepareConstraints(constraints), routesCalculator);
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
      id: t.typeId,
      name: t.type.name.en,
      volume: t.type.volume
    },
    profit: numeral(t.profit).format('0,0'),
    profitPerJump: numeral((Math.floor(t.profit / t.jumps))).format('0,0'),
    profitPercent: numeral(t.profit / (t.tradeUnits * t.sellOrder.price)).format('0.00%'),
    units: t.tradeUnits,
    jumps: t.jumps,
    totalVolume: t.type ? t.tradeUnits * t.type.volume : 'N/A'
  };
}