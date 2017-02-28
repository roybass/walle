const extend = require('extend');
const numeral = require('numeral');
const trade = require('./crest/trade');
const routesCalc = require('./crest/route_calculator');
const constraintsFactory = require('./crest/constraints_factory');
const logger = require('./logger');
const express = require('express');

const defaultConstraints = {
  maxCash: 30000000, // Max available cash for trading
  maxJumps: 10, // Max jumps
  maxCapacity: 5100, // Cubic meters available for hauling
  minProfit: 100000, // Minimum profit per trade (units * price diff)
  regions: 'Metropolis, Heimatar, Derelik, Molden Heath', // Region names included in the search
  fromSystems: 'Rens',
  fromSystemRadius: 2, // Radius (in jumps) from the 'fromSystems' array.
  minSecurity: 0 // Minimum security status of from/to system.
};


const app = express();

const port = 8080;

routesCalc.init().then((routesCalculator) => {

  app.get('/bestTrades', (req, res)  => {

    const constraints = extend({}, defaultConstraints);
    for (const key in defaultConstraints) {
      if (!defaultConstraints.hasOwnProperty(key)) {
        continue;
      }
      if (req.query[key]) {
        constraints[key] = req.query[key];
      }
    }

    trade.findTradesInRegions(constraintsFactory.prepareConstraints(constraints), routesCalculator)
      .then((routes) => {
        res.json(routes.map(formatTrade));
      });

  });


  app.listen(port, () => {
    logger.info('Server ready on port ' + port);
  });
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