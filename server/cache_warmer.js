const async = require('async');
const regions = require('../static/regions');
const crest = require('./crest/crest');
const xmlClient = require('./crest/xml');
const logger = require('../logger');

const DELAY = 15 * 60 * 1000;
let running = false;

function refresh() {
  logger.info("Starting to refresh cache market data");
  const startTime = new Date().getTime();

  const allRegions = regions.getAllRegionIds();

  // create a queue object with concurrency 2
  const q = async.queue((task, callback) => {
    if (task.startTime) {
      const endTime = new Date().getTime();
      logger.info("Finished updating all market data in %d seconds", (endTime - startTime) / 1000);
      return callback();
    }

    if (task.region) {
      return crest.getAllMarketOrders(task.region, false).then(() => {
        return callback();
      });
    }

    if (task.xml) {
        return xmlClient.getSystemStats(false).then(() => callback());
    }
  }, 3);


  for (let region of allRegions) {
    q.push({region});
  }
  q.push({xml: true});
  q.push({startTime});
}

setInterval(refresh, DELAY);
refresh();
