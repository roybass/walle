const rp = require('request-promise');
const fileStore = require('./file_store');
const crestBaseUrl = 'https://crest-tq.eveonline.com/';
const consts = require('./../const');
const log = require('../../logger');

class CrestClient {

  getAllMarketOrders(regionId, useCache = true) {
    const url = 'market/' + regionId + '/orders/all/';
    return this.getDataPaged(url, consts.HOUR, useCache).then((data) => {
      return { data, regionId };
    });
  }

  getMarketOrdersForType(regionId, type, useCache = true) {
    const sellUrl = `market/${regionId}/orders/sell/?type=https://crest-tq.eveonline.com/inventory/types/${type}/`;
    const buyUrl = `market/${regionId}/orders/buy/?type=https://crest-tq.eveonline.com/inventory/types/${type}/`;
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

  getRegions() {
    const url = 'regions/';
    return this.getData(url, consts.YEAR);
  }

  getSystems() {
    const url = 'solarsystems/';
    return this.getData(url, consts.YEAR);
  }

  getStation(stationId) {
    const url = 'stations/' + stationId + '/';
    return this.getData(url, consts.YEAR);
  }

  getTypes() {
    const url = 'inventory/types/';
    return this.getDataPaged(url, consts.YEAR);
  }

  getType(typeId) {
    const url = 'inventory/types/' + typeId + '/';
    return this.getDataPaged(url, consts.YEAR);
  }


  getData(relativeUrl, maxAge, useCache = true) {
    return fileStore.get(relativeUrl, maxAge, useCache).then((data) => {
      if (data !== undefined && data !== null) {
        // log.debug('Found cached data for %s', relativeUrl);
        return JSON.parse(data);
      }
      const url = crestBaseUrl + relativeUrl;
      log.debug('No cache found. Request data from %s', url);
      return rp(url).then((response) => {
        if (!response) {
          log.warn('Error getting data from %s', url);
        }
        const data = response ? response : '{}';
        return fileStore.set(relativeUrl, response).then(() => JSON.parse(response));
      }).catch((err) => {
        return fileStore.set(relativeUrl, '{}').then(() => {
          return {};
        });
      });
    });
  }

  getDataPaged(url, maxAge, useCache, allData = []) {
    return this.getData(url, maxAge, useCache).then((data) => {
      if (data == null) {
        return allData;
      }
      allData.push(data);
      if (data.next) {
        const nextUrl = this.getNextRelativeUrl(data.next);
        return this.getDataPaged(nextUrl, maxAge, useCache, allData);
      }
      return allData;
    });
  }

  getNextRelativeUrl(next) {
    if (next.href.indexOf(crestBaseUrl) === 0) {
      return next.href.substr(crestBaseUrl.length);
    }
  }

  memoize(f) {
    let result = null;
    return (...args) => {
      if (result == null) result = f(...args);
      return result;
    }
  }

}

module.exports = new CrestClient();