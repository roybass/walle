const async = require('async');
const regions = require('../static/regions');
const esi = require('./crest/esi');
const logger = require('../logger');

// Configuration
const DELAY = 15 * 60 * 1000;
const WORKERS = 10;

  // create a queue object with concurrency 2
const q = async.queue((task, callback) => {
  if (task.region) {
    return esi.getAllMarketOrders(task.region, false).then(() => {
      return callback();
    });
  }

  if (task.xml) {
      return esi.getKills(false).then(() => callback());
  }
}, WORKERS);


function refresh() {
  if (!q.idle()) {
    logger.info("Skipped refreshing because previous runs did not finish");
    return;
  }
  logger.info("Starting to refresh cache market data");
  const startTime = new Date().getTime();

  const allRegions = regions.getAllRegionIds();

  q.push({xml: true});
  for (let region of allRegions) {
    q.push({region});
  }

  q.drain = () => {
    const endTime = new Date().getTime();
    logger.info("Finished updating all market data in %d seconds", (endTime - startTime) / 1000);
  };
}

setInterval(refresh, DELAY);
refresh();
