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
	* Transform SPARQL results into visualization canonical format.
	*
	* @abstract
	* @param results Raw SPARQL JSON Results
	* @param ctx A JSON object containing context information, notably the user encoding
	*/
	map(results, ctx) {
		throw new Error(`${this.constructor.name} must implement map(results, ctx)`);
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
