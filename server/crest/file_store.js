const fsp = require('fs-promise');
const NodeCache = require('node-cache');
const logger = require('../../logger');
const root = __dirname + '/../cache';
const defaultMaxAge = 1000 * 60 * 60; // 1 hour

const cache = new NodeCache({ stdTTL: defaultMaxAge, checkperiod: defaultMaxAge });

class FileStore {

  get(key, maxAge, useCache) {
    if (useCache === false) {
      return Promise.resolve(null);
    }
    const valueFromMem = cache.get(key);
    if (valueFromMem) {
      logger.debug("Found %s in memory cache", key);
      return Promise.resolve(valueFromMem);
    }
    const actualMaxAge = maxAge | defaultMaxAge;
    return this.getFolder(key)
      .then((folder) => {
        return fsp.readdir(folder).then((files) => {
          return { folder, files };
        });
      })
      .then((res) => {
        // Find latest file which is not older than max age
        let maxTime = -1;
        for (const file of res.files) {
          const fileTime = parseInt(file);
          const now = new Date().getTime();

          if (now - fileTime > actualMaxAge) {
            fsp.remove(res.folder + '/' + file);
            continue;
          }
          if (fileTime > maxTime) {
            maxTime = fileTime;
          }
        }

        if (maxTime == -1) {
          logger.debug("No recent file found for key %s", key);
          return null;
        }
        return fsp.readFile(res.folder + '/' + maxTime).then((buffer) => {
          let data = buffer.toString();
          cache.set(key, data);
          logger.debug("Found %s in file store", key);
          return data;
        });
      });
  }

  set(key, data) {
    return this.getFolder(key)
      .then((folder) => {
        return fsp.emptyDir(folder).then(() => folder);
      })
      .then((folder) => {
        cache.set(key, data);
        const now = new Date().getTime();
        const fileName = folder + '/' + now;
        return fsp.writeFile(fileName, data).then(() => fileName);
      });
  }

  getFolder(key) {
    const normalizedKey = this.normalize(key);
    const folder = root + '/' + normalizedKey;
    return fsp.ensureDir(folder).then(() => {
      return folder;
    });
  }

  normalize(key) {
    return key.replace(/[^a-z0-9\/]/gi, '_').toLowerCase();
  }
}

module.exports = new FileStore();