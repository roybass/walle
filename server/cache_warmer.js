const regions = require('../static/regions');
const crest = require('./crest/crest');
const logger = require('../logger');

const DELAY = 15 * 60 * 1000;
let running = false;

function refresh() {
  if (running) {
    return;
  }
  running = true;
  logger.info("Starting to refresh cache market data");
  const startTime = new Date().getTime();

  const allRegions = regions.getAllRegionIds();
  let p = Promise.resolve('');

  for (let region of allRegions) {
    p = p.then(() => crest.getAllMarketOrders(region));
  }
  p.then(() => {
    const endTime = new Date().getTime();
    logger.info("Finished updating all market data in %d seconds", (endTime - startTime) / 1000);
    running = false;
  });
  return p;
}

setInterval(refresh, DELAY);
refresh();
