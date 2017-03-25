const extend = require('extend');
const systems = require('../static/systems');
const regions = require('../static/regions');
const jumps = require('../static/jumps');
const logger = require('../logger');

const defaultConstraints = {
  maxCash: 30000000, // Max available cash for trading
  maxJumps: 10, // Max jumps
  maxCapacity: 5100, // Cubic meters available for hauling
  minProfit: 100000, // Minimum profit per trade (units * price diff)
  regions: '', // Region names included in the search, comma delimited
  fromSystems: null,
  fromSystemRadius: 0, // Radius (in jumps) from the 'fromSystems' array.
  toSystems: null, // Only
  minSecurity: 0, // Minimum security status of from/to system.
  tax: 0.02, // Minimum security status of from/to system.
  shipType: 'frigate', // Max ship speed (m/s)
  maxWarpSpeed: 4.5, // MAx ship warp speed (au/s)
  alignTime: 8, // Warp Align time
};


/**
 *
 * @param req Express request.
 */
function getConstraints(req) {
  const constraints = extend({}, defaultConstraints);
  for (const key in defaultConstraints) {
    if (!defaultConstraints.hasOwnProperty(key)) {
      continue;
    }
    if (req.query[key]) {
      constraints[key] = isInteger(key) ? parseInt(req.query[key]) : req.query[key];
    }
  }
  return prepareConstraints(constraints);
}

function isInteger(key) {
  return key !== 'regions'
    && key !== 'fromSystems'
    && key !== 'toSystems'
    && key !== 'shipType';
}
/**
 *
 * @param constraints
 * @returns constraints.
 */
function prepareConstraints(constraints) {
  logger.info('Optimized constraints');
  const newConstraints = extend({}, constraints);
  if (constraints.regions) {
    newConstraints.regions = constraints.regions.split(',').map((system) => regions.getId(system.trim()));
    if (constraints.toSystems) {
      newConstraints.toSystems = new Set(constraints.toSystems.split(',').map(name => {
        const id = systems.nameToId(name.trim());
        if (id === -1) {
          throw Error('Unknown system ' + name.trim());
        }
        return id;
      }));
    }    
  }
  if (constraints.fromSystems) {
    newConstraints.fromSystems = constraints.fromSystems.split(',').map((name) => {
      const id = systems.nameToId(name.trim());
      if (id === -1) {
        throw Error('Unknown system ' + name.trim());
      }
      return id;
    });

    // Expand radius jumps
    let extendedSystems = new Set(newConstraints.fromSystems);
    let newNeighbors = new Set(extendedSystems);
    for (let i = 0; i < constraints.fromSystemRadius; i++) {
      const neighbors = jumps.getNeighbors(newNeighbors);
      newNeighbors = new Set([...neighbors].filter(x => !extendedSystems.has(x)));
      extendedSystems = new Set([...extendedSystems, ...newNeighbors]);
    }

    newConstraints.fromSystems = extendedSystems;
    for (let item of extendedSystems.values()) {
      logger.debug('Start system: ' + systems.findById(item).systemName);
    }

  }
  logger.debug('Constraints : %j', newConstraints);
  return newConstraints;
}

module.exports = {
  prepareConstraints,
  getConstraints
};