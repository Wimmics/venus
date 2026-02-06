
const registry = new Map();

export function registerSparqlMapper(visType, MapperClass) {
  registry.set(visType, MapperClass);
}

export function createSparqlMapper(visType, options = {}) {
  const MapperClass = registry.get(visType);
  if (!MapperClass) {
    throw new Error(`No SPARQL mapper registered for "${visType}". Known types: ${[...registry.keys()].join(", ")}`);
  }
  return new MapperClass(options);
}

/** Optional helpers (nice for tests/debugging) */
export function hasSparqlMapper(visType) {
  return registry.has(visType);
}

export function listSparqlMappers() {
  return [...registry.keys()].sort();
}