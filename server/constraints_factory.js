const extend = require('extend');
const systems = require('../static/systems');
const regions = require('../static/regions');
const jumps = require('../static/jumps');
const logger = require('../logger');

const defaultConstraints = {
  maxCash: { defaultValue : '30000000', parseFunc : parseInt }, // Max available cash for trading
  maxJumps: { defaultValue : '10', parseFunc : parseInt }, // Max jumps
  maxCapacity: { defaultValue : '5100', parseFunc : parseInt }, // Cubic meters available for hauling
  minProfit: { defaultValue : '100000', parseFunc : parseInt }, // Minimum profit per trade (units * price diff)
  regions: { defaultValue : ''}, // Region names included in the search, comma delimited
  fromSystems: { defaultValue : null},
  fromSystemRadius: { defaultValue : '0', parseFunc : parseInt }, // Radius (in jumps) from the 'fromSystems' array.
  toSystems: { defaultValue : null}, // Only
  minSecurity: { defaultValue : '0.0', parseFunc : parseFloat }, // Minimum security status of from/to system.
  tax: { defaultValue : '0.02', parseFunc : parseFloat }, // Minimum security status of from/to system.
  shipType: { defaultValue : 'frigate' }, // Max ship speed (m/s)
  maxWarpSpeed: { defaultValue : '4.5', parseFunc : parseFloat }, // MAx ship warp speed (au/s)
  alignTime: { defaultValue : '8', parseFunc : parseFloat }, // Warp Align time
  avoidLowSec: { defaultValue : 'true', parseFunc : parseBoolean }
};

function parseBoolean(value) {
  return value == 'true';
}

/**
 *
 * @param req Express request.
 */
function getConstraints(req) {
  const constraints = {};

  for (const key in defaultConstraints) {
    if (!defaultConstraints.hasOwnProperty(key)) {
      continue;
    }
    // get value from request or default value
    let value = req.query[key] || defaultConstraints[key].defaultValue;

    // Parse the value if we have a parsing function
    constraints[key] = defaultConstraints[key].parseFunc ? defaultConstraints[key].parseFunc(value) : value;
  }
  return prepareConstraints(constraints);
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