const rp = require('request-promise');
const fileStore = require('./file_store');
const esiBaseUrl = 'https://esi.evetech.net/latest/';
const consts = require('./../const');
const log = require('../../logger');


const timeout = 30000;
class EsiClient {

  async getAllMarketOrders(regionId, useCache = true) {
    const url = 'markets/' + regionId + '/orders/?datasource=tranquility&order_type=all';
    const data = await this.getDataPaged(url, consts.HOUR, useCache);
    return { data, regionId };
  }

  getMarketOrdersForType(regionId, type, useCache = true) {
    //markets/10000001/orders/?datasource=tranquility&order_type=buy&page=1&type_id=123'
    //markets/10000030/datasource=tranquility&order_type=buy&type_id=33475&page=1
    const sellUrl = `markets/${regionId}/orders/?datasource=tranquility&order_type=sell&type_id=${type}`;
    const buyUrl = `markets/${regionId}/orders/?datasource=tranquility&order_type=buy&type_id=${type}`;
    const p1 = this.getDataPaged(sellUrl, consts.MINUTE, useCache);
    const p2 = this.getDataPaged(buyUrl, consts.MINUTE, useCache);
    return Promise.all([p1, p2]).then((buyAndSellOrders) => {
      return {
        sellOrders: buyAndSellOrders[0],
        buyOrders: buyAndSellOrders[1],
        regionId
      }
    })
  }

  async getData(relativeUrl, maxAge, useCache = true) {
    return fileStore.get(relativeUrl, maxAge, useCache).then((data) => {
      if (data !== undefined && data !== null) {
        // log.debug('Found cached data for %s', relativeUrl);
        return JSON.parse(data);
      }
      const url = esiBaseUrl + relativeUrl;
      log.debug('No cache found. Request data from %s', url);
      return rp({url, timeout}).then((response) => {
        if (!response) {
          log.warn('Error getting data from %s', url);
        }
        const data = response ? response : '{}';
        return fileStore.set(relativeUrl, response).then(() => JSON.parse(response));
      }).catch((err) => {
        log.warn('Error getting data for ' + relativeUrl + ': ', err);
        return fileStore.set(relativeUrl, '{}').then(() => {
          return {};
        });
      });
    });
  }

  async getDataPaged(url, maxAge, useCache) {
    const allData = [];
    let page = 0;
    while (true) {
      page++;
      let pageUrl = url + '&page=' + page;
      const data = await this.getData(pageUrl, maxAge, useCache);
      if (data == null || data.length === 0 || (Object.keys(data).length === 0 && data.constructor === Object)) {
        break;
      }
      allData.push(data);
    }
    return allData;
  }
}

module.exports = new EsiClient();