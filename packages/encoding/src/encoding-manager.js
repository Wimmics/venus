import { CHANNEL_TYPES, getSupportedChannels, getEncodingTemplate } from "@wimmics/venus-core";

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
				`Invalid encoding: an explicit encoding object is required for ${this.getChartType()}.`
			);
		}
		
		this._validateTooltipConfig(userEncoding, this.getMarks());
		
		this.validateVisSpecificEncoding(userEncoding);
		this._validateMarks(userEncoding);

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
		this._validateReferencedFieldsExist(encoding, sparqlVars);
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

			console.log("merged encoding = ", mergedEncoding)

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
	
	
	_validateTooltipConfig(encoding, marks = [], rolesByMark = {}) {
		const enabled = encoding?.interactions?.tooltip;
		
		if (enabled !== undefined && typeof enabled !== "boolean") {
			throw new Error('Invalid encoding: "interactions.tooltip" must be a boolean when provided.');
		}
		
		const validateFields = (fields, key) => {
			if (fields == null) return;
			
			if (!Array.isArray(fields)) {
				throw new Error(`Invalid encoding: "${key}" must be an array of query variable names.`);
			}
			
			if (!fields.every((d) => typeof d === "string" && d.trim().length > 0)) {
				throw new Error(`Invalid encoding: "${key}" must contain non-empty strings only.`);
			}
		};
		
		for (const mark of marks) {
			validateFields(encoding?.[mark]?.tooltip?.fields, `${mark}.tooltip.fields`);
			
			for (const role of rolesByMark[mark] ?? []) {
				validateFields(
					encoding?.[mark]?.[role]?.tooltip?.fields,
					`${mark}.${role}.tooltip.fields`
				);
			}
		}
	}
	
	_validateMarks(encoding) {
		for (const mark of this.getMarks()) {
			this._validateMarkDisplay(encoding, mark);
			this._validateMarkSizeField(encoding, mark);
			
			// const nestedChannels = this.getNestedMarkChannels(mark);
			
			// for (const channel of Object.keys(nestedChannels || {})) {
			// 	this._validateNestedField(encoding, mark, channel);
			// }
		}
	}
	
	_validateMarkDisplay(encoding, mark) {
		if (
			encoding?.[mark]?.display !== undefined &&
			typeof encoding[mark].display !== "boolean"
		) {
			throw new Error(
				`Invalid encoding: "${mark}.display" must be a boolean when provided.`
			);
		}
	}
	
	_validateMarkSizeField(encoding, mark) {
		this._validateOptionalField(
			encoding?.[mark]?.size?.field,
			`${mark}.size.field`
		);
	}
	
	_validateNestedField(encoding, mark, channel) {
		this._validateOptionalField(
			encoding?.[mark]?.[channel]?.field,
			`${mark}.${channel}.field`
		);
	}
	
	_validateOptionalField(field, path) {
		if (
			field !== undefined &&
			field !== null &&
			(typeof field !== "string" || !field.trim())
		) {
			throw new Error(
				`Invalid encoding: "${path}" must be a non-empty string when provided.`
			);
		}
	}
	
	_validateReferencedFieldsExist(encoding, vars) {
		if (!Array.isArray(vars) || vars.length === 0) return;
		
		const fields = this._collectFieldReferences(encoding);
		
		for (const { path, value } of fields) {
			if (!vars.includes(value)) {
				throw new Error(
					`Invalid encoding: "${path}" references unknown SPARQL variable "${value}". Available variables are: ${vars.join(", ")}.`
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
				if (typeof value === "string" && value.trim().length > 0) {
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
	
}
