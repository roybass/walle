const extend = require('extend');
const trade = require('./crest/trade');
const regions = require('./static/regions');
const systems = require('./static/systems');
const routesCalc = require('./crest/route_calculator');
const constraintsFactory = require('./crest/constraints_factory');
const logger = require('./logger');
const express = require('express');

const app = express();

const port = 8080;

process.on('unhandledRejection', function(reason, p) {
  console.log("Unhandled Rejection:", reason.stack);
});

routesCalc.init().then((routesCalculator) => {

  app.get('/api/bestTrades', (req, res)  => {
    trade.findTradesInRegions(constraintsFactory.getConstraints(req), routesCalculator)
      .then((routes) => {
        res.json(routes.map(formatTrade));
      });
  });

  app.use('/api/regions', (req, res) => res.json(regions.getAllRegions()));
  app.use('/api/systems', (req, res) => res.json(systems.getAllSystems()));
  app.use('/', express.static('client'));

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
      price: t.sellOrder.price,
      units: t.sellOrder.volume,
      station: t.sellOrder.station
    },
    sell: {
      price: t.buyOrder.price,
      units: t.buyOrder.volume,
      station: t.buyOrder.station
    },
    type: !t.type ? 'N/A' : {
      id: t.typeId,
      name: t.type.name.en,
      volume: t.type.volume
    },
    profit: t.profit,
    profitPerJump: Math.floor(t.profit / t.jumps),
    profitPercent: t.profit / (t.tradeUnits * t.sellOrder.price),
    units: t.tradeUnits,
    jumps: t.jumps,
    route: t.route.map((systemId) => {
      const system = systems.findById(systemId);
      return {
        systemName: system.systemName,
        regionName: system.regionName,
        security: system.security
      }
    }),
    totalVolume: t.type ? t.tradeUnits * t.type.volume : 'N/A'
  };
}