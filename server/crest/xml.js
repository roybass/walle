const rp = require('request-promise');
const fileStore = require('./file_store');
const apiBaseUrl = 'https://api.eveonline.com/';
const consts = require('./../const');
var xmlParser = require('xml-parser');
const log = require('../../logger');

class XmlClient {

  getSystemStats(useCache = true) {
    const url = "map/kills.xml.aspx";
    return this.getData(url, 10 * consts.MINUTE, useCache).then((result => {
      if (!result || !result.root) {
        log.warn('No result found in kill stats');
        return {};
      }
      const rows = result.root.children[1].children[0];
      const systemStats = {};
      for (let row of rows.children) {
        systemStats[row.attributes.solarSystemID] = row.attributes;
      }
      return systemStats;
    }));
  }


  getData(relativeUrl, maxAge, useCache = true) {
    return fileStore.get(relativeUrl, maxAge, useCache).then((data) => {
      if (data !== undefined && data !== null) {
        // log.debug('Found cached data for %s', relativeUrl);
        return xmlParser(data);
      }
      const url = apiBaseUrl + relativeUrl;
      log.debug('No cache found. Request data from %s', url);
      return rp({
            url,
            headers: {
               'User-Agent': 'request'
            }
          }).then((response) => {
        if (!response) {
          log.warn('Error getting data from %s', url);
        }
        const data = response ? response : '{}';
        return fileStore.set(relativeUrl, response).then(() => {
            return xmlParser(response);
          }
        );
      }).catch((err) => {
        log.error(err.message);
        return fileStore.set(relativeUrl, '{}').then(() => {
          return {};
        });
      });
    });
  }
}

module.exports = new XmlClient();