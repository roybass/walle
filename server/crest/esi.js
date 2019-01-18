const rp = require('request-promise');
const fileStore = require('./file_store');
const esiBaseUrl = 'https://esi.evetech.net/latest/';
const consts = require('./../const');
const log = require('../../logger');

const https = require('https');

const agent = new https.Agent();
agent.maxSockets = 10;


const timeout = 30000;
class EsiClient {

  async searchType(typeName, limit, offset) {
    const url = `search/?categories=inventory_type&datasource=tranquility&language=en-us&search=${encodeURIComponent(typeName)}&strict=false`;
    const response = await this.getData(url, consts.MINUTE, false);
    if (response.statusCode !== 200) {
      return [];
    }
    if (!response.data || !response.data.inventory_type) {
      return [];
    }

    const ids = response.data.inventory_type;
    const maxResults = Math.min(limit, ids.length);
    const promises = [];
    for (let i = offset; i < maxResults; i++) {
      const typeUrl = `universe/types/${ids[i]}/?datasource=tranquility&language=en-us`;
      const me = this;
      promises.push(this.getData(typeUrl, consts.WEEK, true)
        .then(async typeResponse => {
          const group = await me.getGroup(typeResponse.data.group_id);
          typeResponse.data.group = group;
          return typeResponse.data;
        }
      ));
    }
    return Promise.all(promises);
  }

  async getGroup(groupId) {
    const url = `universe/groups/${encodeURIComponent(groupId)}/?datasource=tranquility&language=en-us`
    return this.getData(url, consts.WEEK, true).then((response => response ? response.data.name : ''));
  }

  async getAllMarketOrders(regionId, useCache = true) {
    const url = 'markets/' + regionId + '/orders/?datasource=tranquility&order_type=all';
    const data = await this.getDataPaged(url, consts.HOUR, useCache);
    return { data, regionId };
  }

  async getMarketOrdersForType(regionId, type, useCache = true) {
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

  async getKills(useCache = true) {
    const relativeUrl = 'universe/system_kills/?datasource=tranquility'
    const kills = await this.getData(relativeUrl, 10 * consts.MINUTE, useCache);
    const statsAsObj = {};
    kills.data.forEach(item => {
      statsAsObj[item.system_id] = item;
    });
    return statsAsObj;
  }

  async getData(relativeUrl, maxAge, useCache = true) {
    return fileStore.get(relativeUrl, maxAge, useCache).then((data) => {
      if (data !== undefined && data !== null) {
        // log.debug('Found cached data for %s', relativeUrl);
        try {
          return JSON.parse(data);
        } catch (e) {
          log.error('Error parsing cache for url %s, %s, %s', relativeUrl, e.message, data, );
        }
      }
      const url = esiBaseUrl + relativeUrl;
      // log.debug('No cache found. Request data from %s', url);
      return rp({uri: url, 
          timeout, 
          agent,
          resolveWithFullResponse: true
        }).then((response) => {
        if (!response || response.statudCode >= 400) {
          log.warn('Error getting data from %s', url);
        }
        const result = {
          data : JSON.parse(response.body) || {},
          statusCode : response.statusCode,
          pages : response.headers['x-pages']
        };
        log.debug('Done getting data from %s', relativeUrl);
        if (useCache) {
          return fileStore.set(relativeUrl, JSON.stringify(result)).then(() => result);
        } 
        return result;
        
      }).catch((err) => {
        log.error('Error getting data for ' + relativeUrl + ': ', err.message);
        return fileStore.set(relativeUrl, '{"data":{}}').then(() => {data: {}});
      });
    });
  }

  async getDataPaged(url, maxAge, useCache) {
    const allData = [];
    const firstPage = await this.getData(url, maxAge, useCache);
    allData.push(firstPage.data);
    const promises = [];
    for (let page = 1; page < firstPage.pages; page++) {
      let pageUrl = url + '&page=' + page;
      promises.push(this.getData(pageUrl, maxAge, useCache).then((data) => {
        if (data == null || data.length === 0 || (Object.keys(data).length === 0 && data.constructor === Object)) {
          return;
        }
        allData.push(data.data);
      }));
    }
    return Promise.all(promises).then(() => allData);
  }
}

module.exports = new EsiClient();