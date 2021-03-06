const extend = require('extend');
const trade = require('./server/trade');
const orders = require('./server/orders');
const regions = require('./static/regions');
const systems = require('./static/systems');
const stations = require('./static/stations');
const routesCalc = require('./server/route_calculator');
const esi = require('./server/crest/esi');
const constraintsFactory = require('./server/constraints_factory');
const logger = require('./logger');
const express = require('express');
const bodyParser = require('body-parser')

if (!process.argv[2] || process.argv[2] !== 'noUpdates') {
  require('./server/cache_warmer');
}


const app = express();

app.use(bodyParser.json());

const port = 8080;

process.on('unhandledRejection', function (reason, p) {
  console.log("Unhandled Rejection:", reason.stack);
});

routesCalc.init().then((routesCalculator) => {

  app.get('/api/bestTrades', (req, res)  => {
    trade.findTradesInRegions(constraintsFactory.getConstraints(req), routesCalculator)
      .then((routes) => {
        esi.getKills().then((stats) => {
          res.json(routes.map((t) => {
            return formatTrade(t, stats);
          }));
        });

      });
  });

  app.get('/api/search', (req, res) => {
    const query = req.query.q;
    const limit = req.query.limit;
    const offset = req.query.offset;
    esi.searchType(query, limit, offset).then((results) => {
      res.json(results);
    });
  });
  app.get('/api/orders/:type', (req, res) => {
    orders.findProfitableOrders(req.params['type'])
      .then((ordersResult) => {
        res.json(ordersResult);
      });
  });
  app.post('/api/route', async function(req, res) {
    const body = req.body;
    const result = { }
    for (const fromStation of body.fromStations) {
      const routesFromStation = {};
      for (const toStation of body.toStations) {
        if (!stations[fromStation]) {
          logger.info("From station %d not found", fromStation);
          continue;
        }
        const fromSystemId = stations[fromStation].systemId;
        if (!stations[toStation]) {
          logger.info("To station %d not found", toStation);
          continue;
        }
        const toSystemId = stations[toStation].systemId;
        const route = routesCalculator.getRoute(fromSystemId, toSystemId, true);
        routesFromStation[toStation] = route;
      }
      result[fromStation] = routesFromStation;
    }
    console.log(result);
    res.json(result);
  });

  app.use('/api/regions', (req, res) => res.json(regions.getAllRegions()));
  app.use('/api/systems', (req, res) => res.json(systems.getAllSystems()));
  app.use('/', express.static('client'));

  app.listen(port, () => {
    logger.info('Server ready on port ' + port);
  });

});


function formatTrade(t, stats) {
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
      name: t.type.name,
      volume: t.type.volume
    },
    profit: t.profit,
    profitPerJump: Math.floor(t.profit / t.jumps),
    profitPerMinute: (t.profit / t.routeTime) * 60,
    profitPercent: t.profit / (t.tradeUnits * t.sellOrder.price),
    profitPerM3: t.profitPerM3,
    units: t.tradeUnits,
    jumps: t.jumps,
    routeTime: t.routeTime,
    route: t.route.map((systemId) => {
      const system = systems.findById(systemId);
      const systemStats = stats[systemId] || { solarSystemID: systemId.toString(),  ship_kills : 0, npc_kills : 0, pod_kills : 0 };
      return {
        systemName: system.systemName,
        regionName: system.regionName,
        security: system.security,
        stats: systemStats
      }
    }),
    totalVolume: t.type ? t.tradeUnits * t.type.volume : 'N/A',
    totalTrades: t.potentialTradesLength,
    totalSells: t.totalSells,
    totalBuys: t.totalBuys 
  };
}