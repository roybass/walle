const extend = require('extend');
const systems = require('../static/systems');
const regions = require('../static/regions');
const jumps = require('../static/jumps');
const logger = require('../logger');

/**
 *
 * @param constraints
 * @returns constraints.
 */
function prepareConstraints(constraints) {
  logger.info('Optimized contraints');
  const newConstraints = extend({}, constraints);
  newConstraints.regions = constraints.regions.map(regions.getId);
  newConstraints.fromSystems = constraints.fromSystems.map(systems.nameToId);

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
  return newConstraints;
}

module.exports = {
  prepareConstraints
};