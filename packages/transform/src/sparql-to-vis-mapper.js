/**
 * Base class for transforming SPARQL results into visualization-specific data structures.
 * 
 * Each visualization type (bar chart, line chart, graph, etc.) has its own SparqlToVisMapper
 * subclass that transforms raw SPARQL JSON results into the canonical data format required
 * by that visualization's renderer and encoding manager.
 * 
 * For example:
 * - SparqlToBarChartMapper transforms results into { rows: [...], chart: {...} }
 * - SparqlToForceGraphMapper transforms results into { nodes: [...], links: [...] }
 * - SparqlToSankeyMapper transforms results into { nodes: [...], links: [...] }
 * 
 * Subclasses must implement the `map()` method.
 * 
 * @abstract
 * 
 * @example
 * import { createSparqlMapper } from '@wimmics/venus-transform';
 * import { VIS_TYPES } from '@wimmics/venus-core';
 * 
 * const mapper = createSparqlMapper(VIS_TYPES.VENUS_BARCHART);
 * 
 * const sparqlResults = {
 *   head: { vars: ['category', 'value'] },
 *   results: { bindings: [ ... ] }
 * };
 * 
 * const mappedData = mapper.map(sparqlResults, { encoding: userEncoding });
 * // Returns: { rows: [...], chart: {...} }
 */
export class SparqlToVisMapper {
	
	/**
	 * Creates a new SparqlToVisMapper.
	 * 
	 * @param {Object} [options={}] - Configuration options.
	 * @param {string} [options.visType] - Optional identifier of mapper type (for debugging).
	 * @throws {Error} If attempting to instantiate the abstract base class directly.
	 */
	constructor(options = {}) {
		if (new.target === SparqlToVisMapper) {
			throw new Error("SparqlToVisMapperBase is abstract and cannot be instantiated directly.");
		}
		
		this.options = options;
		this.visType = options.visType || "unknown";
	}
	
	/**
	 * Transforms SPARQL JSON results into visualization-specific data format.
	 * 
	 * This abstract method must be implemented by subclasses to perform visualization-specific
	 * data transformations. For example, a bar chart mapper extracts and aggregates data into
	 * rows, while a graph mapper identifies nodes and links from entity relationships.
	 * 
	 * The mapping process typically:
	 * 1. Validates SPARQL result structure
	 * 2. Extracts and processes variable bindings
	 * 3. Applies encoding-specific field selections
	 * 4. Structures data according to visualization requirements
	 * 5. Derives additional properties (colors, sizes, labels based on encoding)
	 * 
	 * @abstract
	 * @param {Object} results - Raw SPARQL JSON results.
	 *   @param {Object} results.head - SPARQL result header.
	 *   @param {string[]} results.head.vars - List of result variable names.
	 *   @param {Object} results.results - Result bindings.
	 *   @param {Array} results.results.bindings - Array of variable bindings (one per result).
	 * @param {Object} ctx - Transformation context.
	 *   @param {Object} ctx.encoding - The visual encoding specification (defines field mappings).
	 * @returns {Object} Visualization-specific data structure.
	 *   Return type depends on visualization type (e.g., {rows, chart} for bar charts,
	 *   {nodes, links} for graphs and sankeys).
	 * @throws {Error} If results format is invalid or required fields are missing.
	 * 
	 * @example
	 * // Bar chart mapper
	 * const barChartData = mapper.map(sparqlResults, { encoding });
	 * // Returns: { rows: [ {category, value, ...}, ... ], chart: {...} }
	 * 
	 * // Graph mapper
	 * const graphData = mapper.map(sparqlResults, { encoding });
	 * // Returns: { nodes: [ {...}, ... ], links: [ {...}, ... ] }
	 */
	map(results, ctx) {
		throw new Error(`${this.constructor.name} must implement map(results, ctx)`);
	}

	/**
	 * Validates the basic structure of SPARQL JSON results.
	 * 
	 * Checks that results have the required head and results sections with
	 * valid variable names and bindings array. Subclasses can call this helper
	 * to perform basic validation before processing.
	 * 
	 * @protected
	 * @param {Object} results - SPARQL JSON results to validate.
	 * @throws {Error} If results structure is invalid.
	 * 
	 * @example
	 * map(results, ctx) {
	 *   this._assertValidResults(results);  // Throws if invalid
	 *   // ... process valid results ...
	 * }
	 */
	_assertValidResults(results) {
		if (!results || !results.head || !results.results) {
			throw new Error("Invalid SPARQL results format.");
		}
		
		if (!Array.isArray(results.results.bindings)) {
			throw new Error("SPARQL results missing 'bindings' array.");
		}
	}
	
	
	_resolveLabelFromBinding({ labelsConfig = null, fieldBindingValue = null, currentBinding = null }) {
		return this._resolveLabelValue({
			labelsConfig,
			getFieldValue: (field) => currentBinding?.[field]?.value,
			fallbackValue: fieldBindingValue.value,
			coerceToString: false
		});
	}
	
	_resolveLabelFromDatum({ labelsConfig = null, datum = {}, fallbackField = null }) {
		return this._resolveLabelValue({
			labelsConfig,
			getFieldValue: (field) => datum?.[field],
			fallbackValue: fallbackField ? datum?.[fallbackField] : null,
			coerceToString: true
		});
	}
	
	/**
	* Resolve mark label text using a shared strategy for all mappers.
	* Priority: labels.value > labels.field > fallbackValue.
	*/
	_resolveLabelValue({ labelsConfig, getFieldValue, fallbackValue = null, coerceToString = false }) {
		const labelValue =
			labelsConfig &&
			typeof labelsConfig === "object" &&
			typeof labelsConfig.value === "string"
			? labelsConfig.value
			: null;
		if (labelValue !== null) return coerceToString ? String(labelValue) : labelValue;
		
		const labelField =
			labelsConfig &&
			typeof labelsConfig === "object" &&
			typeof labelsConfig.field === "string" &&
			labelsConfig.field.trim()
			? labelsConfig.field.trim()
			: null;
		
		const candidate = labelField ? getFieldValue?.(labelField) : fallbackValue;
		const resolved = Array.isArray(candidate) ? candidate[0] : candidate;
		
		if (resolved === undefined || resolved === null || resolved === "") {
			return null;
		}
		
		return coerceToString ? String(resolved) : resolved;
	}
}
