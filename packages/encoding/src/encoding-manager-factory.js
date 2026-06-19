/**
 * Encoding Manager Factory
 * 
 * Registry-based factory for creating visualization-specific encoding managers.
 * Follows the same pattern as mapper-factory.js for consistency.
 * Allows dynamic registration of new visualization types.
 */

const registry = new Map();

/**
 * Register an encoding manager class for a visualization type.
 * @param {string} visType - Visualization type identifier
 * @param {Function} EncodingManagerClass - Constructor for the encoding manager
 */
export function registerEncodingManager(visType, EncodingManagerClass) {
  registry.set(visType, EncodingManagerClass);
}

/**
 * Create an encoding manager for the specified visualization type.
 * @param {string} visType - Visualization type ('force-graph', 'sankey', etc.)
 * @returns {EncodingManager} Encoding manager instance
 * @throws {Error} If visualization type is not registered
 */
export function createEncodingManager(visType) {
  const ManagerClass = registry.get(visType);
  if (!ManagerClass) {
    throw new Error(
      `No encoding manager registered for "${visType}". Known types: ${[...registry.keys()].join(", ")}`
    );
  }

  return new ManagerClass();
}

/**
 * Check if an encoding manager is registered for a visualization type.
 * @param {string} visType - Visualization type
 * @returns {boolean} True if registered
 */
export function hasEncodingManager(visType) {
  return registry.has(visType);
}

/**
 * List all registered visualization types.
 * @returns {string[]} Sorted array of registered visualization types
 */
export function listEncodingManagers() {
  return [...registry.keys()].sort();
}
