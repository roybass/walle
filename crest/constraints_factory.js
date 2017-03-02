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
  regions: 'Metropolis, Heimatar, Derelik, Molden Heath', // Region names included in the search
  fromSystems: null,
  fromSystemRadius: 0, // Radius (in jumps) from the 'fromSystems' array.
  minSecurity: 0 // Minimum security status of from/to system.
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
  return key !== 'regions' && key !== 'fromSystems';
}
/**
 *
 * @param constraints
 * @returns constraints.
 */
function prepareConstraints(constraints) {
  logger.info('Optimized contraints');
  const newConstraints = extend({}, constraints);
  newConstraints.regions = constraints.regions.split(',').map((system) => regions.getId(system.trim()));
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
  return newConstraints;
}

module.exports = {
  prepareConstraints,
  getConstraints
};