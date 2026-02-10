const registry = new Map();

/**
 * Register a renderer class for a visualization type.
 * @param {string} visType
 * @param {Function} RendererClass
 */
export function registerRenderer(visType, RendererClass) {
  registry.set(visType, RendererClass);
}

/**
 * Create a renderer instance for a visualization type.
 * @param {string} visType
 * @param {Object} options
 * @returns {Object}
 */
export function createRenderer(visType, options = {}) {
  const RendererClass = registry.get(visType);
  if (!RendererClass) {
    throw new Error(
      `No renderer registered for "${visType}". Known types: ${[...registry.keys()].join(", ")}`
    );
  }
  return new RendererClass(options);
}

/**
 * Check if a renderer is registered for a visualization type.
 * @param {string} visType
 * @returns {boolean}
 */
export function hasRenderer(visType) {
  return registry.has(visType);
}

/**
 * List all registered renderer visualization types.
 * @returns {string[]}
 */
export function listRenderers() {
  return [...registry.keys()].sort();
}

