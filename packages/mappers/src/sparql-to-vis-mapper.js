/**
 * Base class for SPARQL → Visualization mappers.
 * Concrete subclasses MUST implement map().
 */
export class SparqlToVisMapper {

  /**
   * @param {Object} [options]
   * @param {string} [options.visType] Optional identifier of mapper type
   */
  constructor(options = {}) {
    if (new.target === SparqlToVisMapper) {
      throw new Error("SparqlToVisMapperBase is abstract and cannot be instantiated directly.");
    }

    this.options = options;
    this.visType = options.visType || "unknown";
  }

  /**
   * Validate SPARQL results basic structure.
   * Subclasses can call this.
   */
  _assertValidResults(results) {
    if (!results || !results.head || !results.results) {
      throw new Error("Invalid SPARQL results format.");
    }

    if (!Array.isArray(results.results.bindings)) {
      throw new Error("SPARQL results missing 'bindings' array.");
    }
  }

  /**
   * Transform SPARQL results into visualization canonical format.
   *
   * @abstract
   * @param {any} results
   * @param {import('./types.js').MapContext} ctx
   * @returns {import('./types.js').MapResult}
   */
  map(results, ctx) {
    throw new Error(`${this.constructor.name} must implement map(results, ctx)`);
  }
}
