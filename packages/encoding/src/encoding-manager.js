import { 
	CHANNEL_TYPES, MARK_TYPES, ALIGN_TYPES, VIS_TYPES, BINNING_METHODS, SCALE_TYPES, SUPPORTED_KEYS,
	getSupportedChannels, 
	getEncodingTemplate,  
	getMarkSupportedKeys,  
	getColorPalettesNames,

	isMetricSupported, 
	isGroupsSupported,

	isMark,
	isCartesianVis,
	isNetworkVis,
	
	isOrdinalScaleType,
	isColorScale,
	isThresholdScaleType,
	isLayoutScale,
	isQuantitativeScaleType,

	isValidCssColor
} from "@wimmics/venus-core";

/**
 * Base class for visual encoding managers.
 * 
 * Encoding managers validate and transform user-provided encoding specifications into
 * valid configurations for visualization rendering. Each visualization type (bar chart,
 * line chart, graph, etc.) has its own EncodingManager subclass that implements
 * visualization-specific validation and merging logic.
 * 
 * Responsibilities:
 * - Validate user encoding against visualization-specific rules
 * - Merge user encoding with visualization-specific defaults
 * - Provide metadata about supported marks and visual channels
 * - Validate that referenced data fields exist in SPARQL query results
 */
export class EncodingManager {
	constructor() { }

	getChartType() {
		throw new Error("getChartType must be implemented by subclass")
	}
	
	getMarks() {
		return [];
	}
	
	/**
	 * Returns the default encoding template for this visualization type.
	 * 
	 * Default encodings include all required marks and sensible defaults for optional
	 * properties (e.g., default colors, default scales, default interaction settings).
	 * 
	 * Must be implemented by subclasses.
	 * 
	 * @abstract
	 * @returns {Object} The default encoding specification for this visualization type.
	 */
	getDefaultEncoding() {
		return getEncodingTemplate(this.getChartType());
	}

	/**
	 * Merges user-provided encoding with visualization-specific defaults.
	 * 
	 * Combines user encoding with the default encoding for this visualization type,
	 * ensuring all required fields have values. The user encoding takes precedence
	 * over defaults. Performs deep merging for nested objects (marks, scales, interactions).
	 * 
	 * Must be implemented by subclasses.
	 * 
	 * @abstract
	 * @param {Object} userEncoding - The user-provided encoding specification (already validated).
	 * @returns {Object} The merged encoding with all defaults applied and all required fields populated.
	 */
 	mergeEncoding(userEncoding) {
		const defaults = this.getDefaultEncoding();

		const mergedEncoding = {
			...defaults,
			...userEncoding,
			interactions: {
				...(defaults.interactions || {}),
				...(userEncoding.interactions || {})
			}
		}

		for (const mark of this.getMarks()) {
            mergedEncoding[mark] = {
				...(defaults?.[mark]),
				...(userEncoding?.[mark])
			};
			
			this._mergeChannels(
				mergedEncoding[mark], 
				defaults?.[mark], 
				userEncoding?.[mark], 
				getSupportedChannels(mark)
			)
        }
		
		this.mergeVisSpecificEncoding(
			mergedEncoding, 
			defaults, 
			userEncoding)

		return mergedEncoding
	}

	_mergeChannels(merged, defaults, user, channels) {
		for (const channel of channels) {
			if (defaults?.[channel] == null && user?.[channel] == null) continue;

			merged[channel] = {
				...defaults?.[channel],
				...user?.[channel]
			}
		}
	}

	mergeVisSpecificEncoding(){
		throw new Error("mergeVisSpecificEncoding must be implemented by subclass.")
	}
	
	/**
	 * Validates a user-provided encoding specification.
	 * 
	 * Checks that the encoding conforms to visualization-specific rules:
	 * - All required marks are present and valid
	 * - All field references are valid
	 * - All scale configurations are valid
	 * - Tooltip configurations are well-formed
	 * - Interaction settings are valid
	 * 
	 * @param {Object} userEncoding - The user-provided encoding specification.
	 * @throws {Error} If encoding is invalid. Error message describes the specific problem.
	 */
	validateEncoding(userEncoding) {
		if (!userEncoding || typeof userEncoding !== "object") {
			throw new Error(
				`Invalid encoding: an explicit encoding object is required.`
			);
		}
		
		this._validateMarks(userEncoding); // should validate supported keys per mark

		this._validateInteractions(userEncoding)

		this.validateVisSpecificEncoding(userEncoding);
	}

	_validateMarkChannels(userEncoding, path, mark) {
		for (let channel of getSupportedChannels(mark)) {
			let channelEncoding = userEncoding?.[channel]

			if (!this._isProvided(channelEncoding))
				continue

			if (Array.isArray(channelEncoding) || typeof channelEncoding === "string") {
				throw new Error(
					`Invalid encoding: "${path}.${channel}" must be an object containing "value" ${channel !== 'opacity' ? ' or "field"' : ""}.`
				);				
			}

			if (this._isProvided(channelEncoding?.value) && this._isProvided(channelEncoding?.field)) {
				console.warn(`Ignored encoding: when both "${path}.${channel}.field" and "${path}.${channel}.value" are provided, "${path}.${channel}.field" takes precedence.`);
			}

			this._validateValue(channelEncoding?.value,`${path}.${channel}`,  channel)
			this._validateField(channelEncoding?.field, `${path}.${channel}`, channel)
			this._validateMetric(channelEncoding, `${path}.${channel}`, mark)

			this._validateLegends(channelEncoding, `${path}.${channel}`)
			this._validateScales(channelEncoding, `${path}.${channel}`, channel)

			this._validateSupportedKeys(SUPPORTED_KEYS.channels[channel] ?? SUPPORTED_KEYS.channels.default, Object.keys(channelEncoding), `${path}.${channel}`)
		}
	}

	_validateField(field, path, channel) {
		if (!this._isProvided(field))
			return
		
		if (channel === CHANNEL_TYPES.OPACITY) {
			throw new Error(`Invalid encoding: "${path}.field" is not supported.`)
		}

		if (!this._isNonEmptyString(field) || field === null) {
			throw new Error(`Invalid encoding: "${path}.field" must be a non-empty string.`);
		}
	}

	_validateValue(value, path, channel) {
		if (!this._isProvided(value)) {
			if (channel === CHANNEL_TYPES.OPACITY) {
				console.warn(`Ignored encoding: "${path}.value" is required.`)	
			}
			return
		}

		if (channel === CHANNEL_TYPES.OPACITY && !this._isUnitInterval(value)) {
			console.warn(`Ignored encoding: "${path}.value" must be a number between 0 and 1 when provided.`);		
		}

		if (isColorScale(channel)) {
			if (!this._isNonEmptyString(value) || !isValidCssColor(value)) {
				throw new Error(`Invalid encoding: "${path}.value" must be a non-empty string containing a valid CSS color (e.g., "red", "#ff0000", or "rgb(255, 0, 0)"). See the MDN CSS color reference for the list of supported color values.`)
			}
		}

		if (!isColorScale(channel) && !this._isNonNegativeNumber(value)) {
			throw new Error(`Invalid encoding: "${path}.value must be a non-negative number when provided.`)
		}
	}

	_validateInteractions(userEncoding) {
		if (!this._isProvided(userEncoding?.interactions))
			return
		
		for (const key of SUPPORTED_KEYS.interactions) {
			if (this._isProvided(userEncoding?.interactions?.[key]) && !this._isBoolean(userEncoding?.interactions?.[key])) {
				throw new Error(`Invalid encoding: "interactions.${key}" must be a boolean when provided.`);
			}
		}

		this._validateSupportedKeys(SUPPORTED_KEYS.interactions, Object.keys(userEncoding?.interactions), "interactions")
	}

	_validateSupportedKeys(supportedKeys, providedKeys, path) {
		const diff = this._getArrayDifference(providedKeys, supportedKeys)
		if (diff.length) {
			console.warn(`Ignored encoding: "${path}" contain non-supported properties (${diff.join(', ')}).`)
		}
	}
	
	_validateTooltips(tooltipEncoding, path) {
		if (!this._isProvided(tooltipEncoding?.tooltip)) return

		const fields = tooltipEncoding?.tooltip?.fields

		if (!this._isProvided(fields) || !fields.length) {
			console.warn(`Ignored encoding: ${path}.tooltip.fields is either missing or empty. Using default.`)
			return
		}
		
		if (!Array.isArray(fields)) {
			throw new Error(`Invalid encoding: "${path}.tooltip.fields" must be an array of query variable names.`);
		}
		
		if (!fields.every((d) => this._isNonEmptyString(d))) {
			throw new Error(`Invalid encoding: "${path}.tooltip.fields" must contain non-empty strings only.`);
		}

		if (this._isProvided(tooltipEncoding?.title) && !this._isNonEmptyString(tooltipEncoding?.title)) {
			throw new Error(`Invalid encoding: "${path}.tooltip.title" must be a non-empty string when provided.`)
		}

		this._validateSupportedKeys(SUPPORTED_KEYS.tooltip, Object.keys(tooltipEncoding?.tooltip), `${path}.tooltip`)
	}

	_validateMetric(userEncoding, path, mark) {
		if (!this._isProvided(userEncoding?.metric)) 
			return

		if (!isMetricSupported(mark)) {
			throw new Error(`Invalid encoding: "${path}.metric" is not supported.`)
		}

		if (!this._isNonEmptyString(userEncoding?.metric)) {
			throw new Error(`Invalid encoding: "${path}.metric" must be a non-empty string when provided.`)
		}

		if (userEncoding?.metric !== "degree") {
			throw new Error(`Invalid encoding: "${path}.metric" must be "degree" when provided.`);
		}

		if (this._isProvided(userEncoding?.field)) {
			throw new Error(`Invalid encoding: "${path}" cannot define both "field" and "metric".`);
		}
	}

	_validateScales(userEncoding, path, channel) {
		const scaleEncoding = userEncoding?.scale
		if (!this._isProvided(scaleEncoding))
			return

		if (!this._isProvided(userEncoding?.field) && !this._isProvided(userEncoding?.metric)) {
			console.warn(`Ignored encoding: "${path}.scale" requires "${path}.field" or "${path}.metric". Using "${path}.metric" with default value.`)
			return
		}

		if (!this._isNonEmptyObject(scaleEncoding) || this._isString(scaleEncoding)) {
			console.warn(`Ignored encoding: "${path}.scale" must be a non-empty object. Using default values.`)
			return
		}

		const scaleTypes = Object.values(SCALE_TYPES)
		if (this._isProvided(scaleEncoding?.type)) {

			if (!scaleTypes.includes(scaleEncoding?.type)) {
				throw new Error(`Invalid encoding: ${scaleEncoding?.type} unknown for "${path}.scale.type". Possible values: ${scaleTypes.join(', ')}.`)
			}

			if (scaleEncoding?.type === SCALE_TYPES.POW && !this._isProvided(scaleEncoding?.exponent)) {
				console.warn(`Ignored encoding: "pow" scales require "scale.exponent".`)
			}

			if (isThresholdScaleType(scaleEncoding?.type) && isLayoutScale(channel)) {
				throw new Error(`Invalid encoding: ${channel} do not support "threshold" scales.`)
			}

			if (isQuantitativeScaleType(scaleEncoding?.type) && this._isProvided(scaleEncoding?.range)) {

				if (Array.isArray(scaleEncoding?.range)) {
					if (scaleEncoding?.range.length < 2) {
						console.warn(`Ignored encoding: "${path}.scale.range" must be an array containing at least two numeric values.`)
					}
					else {
						const invalidValues = scaleEncoding?.range.filter(d => !this._isNumber(d))
						if (invalidValues.length) {
							console.warn(`Ignored encoding: "${path}.scale.range" contain invalid values (${invalidValues.join(', ')}).`)
						}
					}
				}
			}
		}

		if (isColorScale(channel)) {
			if (this._isProvided(userEncoding?.metric) && !["quantitative", "sequential"].includes(scaleEncoding?.type)) {
				throw new Error(`Invalid encoding: "${path}.scale.type" must be "quantitative" or "sequential" for metric color.`);
			}
			
			if (this._isString(scaleEncoding?.range)) {
				const colorPalettesLowerCase = getColorPalettesNames().map(d => d.toLowerCase())
				if (!colorPalettesLowerCase.includes(scaleEncoding?.range.toLowerCase())) {
					if (isValidCssColor(scaleEncoding?.range)) {
						console.warn(`Ignored encoding: "${scaleEncoding?.range}" is a valid color name. Use "${path}.value" for constant color. "${path}.scale.range" expects a color palette name. Using default.`)
					} else {
						console.warn(
						`Ignored encoding: "${scaleEncoding?.range}" is not a recognized palette for "${path}.scale.range" (case-insensitive). ` +
						`See valid palette names: https://d3js.org/d3-scale-chromatic.`
						);
					}
				}
			}

			if (Array.isArray(scaleEncoding?.range)) {
				const invalidColors = scaleEncoding?.range.filter(d => !isValidCssColor(d))
				if (invalidColors.length) {
					console.warn(`Ignored encoding: "${path}.scale.range" contains invalid color names (${invalidColors.join(', ')}). Only valid colors will be used.`)
				}			
			}
		}

		

		if (this._isProvided(scaleEncoding?.exponent)) {
			if (scaleEncoding?.type !== SCALE_TYPES.POW) {
				console.warn(`Ignored encoding: "exponent" is only supported for "pow" scales.`)
			} else if (!this._isNonNegativeNumber(scaleEncoding?.exponent)) {
				throw new Error(`Invalid encoding: "exponent" must be a non-negative number.`)
			}
		}

		if (this._isProvided(scaleEncoding?.padding)) {
			if (![SCALE_TYPES.BAND, SCALE_TYPES.POINT].includes(scaleEncoding?.type) && channel != "x") {
				console.warn(`Ignored encoding: "padding" is only supported for "point" and "band" scales.`)
			} else if (!this._isUnitInterval(scaleEncoding?.padding) || scaleEncoding?.padding >= 1) {
				throw new Error(`Invalid encoding: "${path}.padding" must be a number between 0 and 1 (excluded) when provided.`) 
			}
		}

		if (this._isProvided(scaleEncoding?.binning)) {
			if (!isThresholdScaleType(scaleEncoding?.type)) {
				console.warn(`Ignored encoding: "binning" is only supported for "threshold" scales.`)
			} else {
				if (!this._isNonEmptyObject(scaleEncoding?.binning) || this._isString(scaleEncoding?.binning)) {
					console.warn(`Ignored encoding: "${path}.scale.binning" must be a non-empty object when provided.`)
				}

				const method = scaleEncoding?.binning?.method
				if (this._isProvided(method) && !Object.values(BINNING_METHODS).includes(method)) {
					console.warn(`Ignored encoding: "${method}" unknown for "${path}.scale.binning.method". Possible values: ${Object.values(BINNING_METHODS).join(', ')}.`)
				}

				const bins = scaleEncoding?.binning?.bins
				if (this._isProvided(bins) && !this._isNonNegativeNumber(bins)) {
					console.warn(`Ignored encoding: "${path}.scale.binning.bins" must be a non-negative number when provided. Using default.`) 
				}

				const breaks = scaleEncoding?.binning?.breaks
				if (this._isProvided(breaks)) {
					if (!Array.isArray(breaks)) {
						console.warn(`Ignored encoding: "${path}.scale.binning.breaks" must be a list of valid data values when provided.`) 
					}

					if (!breaks.every(d => this._isNumber(d))) {
						console.warn(`Ignored encoding: "${path}.scale.binning.breaks" must be a list of numbers when provided. Non-number values are ignored.`)
					}
				}
			}
		}

		this._validateSupportedKeys(SUPPORTED_KEYS.scale, Object.keys(scaleEncoding), `${path}.scale`)

		// Range and domain values are validated later on color-scale-calculator.js
	}

	_validateGroups(userEncoding, path, mark) {
		const groups = userEncoding?.groups

		if (!this._isProvided(groups)) 
			return

		if (!isGroupsSupported(mark)) {
			console.warn(`Ignored encoding: "${path}.groups" is not supported.`)
			return
		}

		if (!this._isNonEmptyObject(groups) || !this._isProvided(groups?.field)) {
			console.warn(`Ignored encoding: "${path}.groups" must be a non-empty object containing a "field" property when provided.`)
		}

		this._validateField(groups?.field, `${path}.groups`)

		this._validateSupportedKeys(SUPPORTED_KEYS.groups, Object.keys(groups), `${path}.groups`)
	}

	_validateLegends(userEncoding, path) {
		const legendEncoding = userEncoding?.legend

		if (!this._isProvided(legendEncoding))
			return

		if (this._validateDisplay(legendEncoding, `${path}.legend`) == false)
			return

		if (!this._isProvided(userEncoding?.field) && !this._isProvided(userEncoding?.metric)) {
			console.warn(`Ignored encoding: "${path}.legend" requires "${path}.field" or "${path}.metric".`)
		}

		if (this._isProvided(userEncoding?.value) && !this._isProvided(userEncoding?.field)) {
			console.warn(`Ignored encoding: "${path}.legend" does not work with "${path}.value".`)
		}

		if (this._isProvided(legendEncoding?.title) && !this._isNonEmptyString(legendEncoding?.title)) {
			console.warn(`Ignored encoding: "${path}.legend.title" must be a non-empty string when provided.`)
		}

		this._validateSupportedKeys(SUPPORTED_KEYS.legend, Object.keys(legendEncoding), `${path}.legend`)
	}

	_validateDisplay(userEncoding, path) {

		if (!this._isProvided(userEncoding?.display))
			return

		if (!this._isBoolean(userEncoding?.display) ) {
			throw new Error(`Invalid encoding: "${mark}.display" must be a boolean when provided.`);
		}

		const providedKeys = Object.keys(userEncoding).filter(key => key !== "display")
		if (userEncoding?.display === false) {
			console.warn(`Ignored encoding: ${providedKeys.map(key => `"${path}.${key}"`).join(', ')} due to "${path}.display:false".`)
			return false
		}
	}

	_validateLabels(userEncoding, path) {
		if (!this._isProvided(userEncoding?.labels))
			return

		if (this._validateDisplay(userEncoding?.labels, `${path}.labels`) === false)
			return

		if (!this._isProvided(userEncoding?.labels?.value) && !this._isProvided(userEncoding?.labels?.field)) {
			console.warn(`Ignored encoding: either "${path}.labels.value" or "${path}.labels.field" must be provided when using "${path}.labels".`)
			return
		}

		this._validateValue(userEncoding?.labels?.value, `${path}.labels`)
		this._validateField(userEncoding?.labels?.field, `${path}.labels`)

		this._validateSupportedKeys(SUPPORTED_KEYS.labels, Object.keys(userEncoding?.labels), `${path}.labels`)
	}
	
	_validateMarks(userEncoding) {
		const supportedMarks = this.getMarks()
		const providedMarks = Object.keys(userEncoding).filter(key => isMark(key))
		
		const markEncoding = (mark) => userEncoding?.[mark] ?? {}

		const diff = this._getArrayDifference(providedMarks, supportedMarks)
		if (diff.length) {
			console.warn(`Ignored encoding: ${this.getChartType()} contain unsupported marks (${diff.join(", ")}).`)
		}

		for (const mark of this.getMarks()) {
			const currentEncoding = markEncoding(mark)

			const supportedKeys = getMarkSupportedKeys(mark)
			if (supportedKeys.includes("display") && this._validateDisplay(currentEncoding, mark) === false)
				return
			
			this._validateTooltips(currentEncoding, `${mark}`)
			this._validateMarkChannels(currentEncoding, `${mark}`, mark)
			this._validateGroups(currentEncoding, `${mark}`, mark)
			this._validateSupportedKeys(SUPPORTED_KEYS.marks(this.getChartType(), mark), Object.keys(currentEncoding), `${mark}`)
		}
	}
	

	/**
	 * Validates visualization-specific encoding requirements.
	 * 
	 * This abstract method is implemented by subclasses to check visualization-specific
	 * constraints. For example, a bar chart might validate that required axis fields are
	 * present, while a graph visualization might validate node/link specifications.
	 * 
	 * Must be implemented by subclasses.
	 * 
	 * @abstract
	 * @param {Object} merged - The merged encoding specification (with defaults applied).
	 * @throws {Error} If visualization-specific validation fails.
	 */
	validateVisSpecificEncoding(merged) {
		throw new Error("validateEncoding must be implemented by subclass");
	}

	/**
	 * Validates that all field references in the encoding exist in the SPARQL query results.
	 * 
	 * Checks every field reference in the encoding against the list of available SPARQL
	 * variables. This ensures that when data is fetched, all referenced fields will exist.
	 * 
	 * @param {Object} encoding - The validated encoding specification.
	 * @param {string[]} [sparqlVars=[]] - List of variable names from SPARQL query results.
	 * @throws {Error} If any field reference is not found in sparqlVars.
	 */
	validateReferencedFields(encoding, sparqlVars = []) {
		if (!Array.isArray(sparqlVars) || sparqlVars.length === 0) return;
		
		const fields = this._collectFieldReferences(encoding);
		
		for (const { path, value } of fields) {
			if (!sparqlVars.includes(value)) {
				throw new Error(
					`Invalid encoding: "${path}" references unknown SPARQL variable "${value}". Available variables are: ${sparqlVars.join(", ")}.`
				);
			}
		}
	}
	
	_collectFieldReferences(obj, basePath = "") {
		const fields = [];
		
		if (!obj || typeof obj !== "object") {
			return fields;
		}
		
		for (const [key, value] of Object.entries(obj)) {
			const path = basePath ? `${basePath}.${key}` : key;
			
			if (key === "field") {
				if (this._isNonEmptyString(value)) {
					fields.push({ path, value });
				}
				
				continue;
			}
			
			if (value && typeof value === "object" && !Array.isArray(value)) {
				fields.push(...this._collectFieldReferences(value, path));
			}
		}
		
		return fields;
	}
	
	// helpers

	_isUnitInterval(value) {
		return Number.isFinite(value) && value >= 0 && value <= 1;
	}

	_isProvided(value) {
		return value !== undefined
	}

	_isString(value) {
		return typeof value === "string"
	}

	_isNonEmptyString(value) {
		return this._isString(value) && !!value.trim();
	}

	_isBoolean(value) {
		return typeof value === "boolean"
	}

	_isNumber(value) {
		return Number.isFinite(value)
	}

	_isNonNegativeNumber(value) {
		return this._isNumber(value) && value >= 0;
	}

	_isObject(value) {
		return typeof value === 'object'
	}

	_isNonEmptyObject(value) {
		return this._isObject(value) && Object.keys(value).length > 0
	}

	

	_getArrayDifference(a, b) {
		return a.filter(value => !b.includes(value))
	}
}
