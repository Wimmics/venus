/**
* Base EncodingManager class
* 
* Validate user encoding before mapping to visual artifacts.
*/
export class EncodingManager {
	constructor() { }

	getChartType() {
		throw new Error("getChartType must be implemented by subclass")
	}
	
	getMarks() {
		return [];
	}
	
	getMarkChannels() {
		return {
			color: true,
			size: true,
			tooltip: true
		};
	}
	
	getNestedMarkChannels() {
		return {};
	}
	
	/**
	* Get the default encoding template for this visualization type.
	* Must be implemented by subclasses.
	* @returns {Object} Default encoding config
	*/
	getDefaultEncoding() {
		throw new Error("getDefaultEncoding must be implemented by subclass");
	}
	
	validateEncoding(userEncoding) {
		if (!userEncoding || typeof userEncoding !== "object") {
			throw new Error(
				`Invalid encoding: an explicit encoding object is required for ${this.getChartType()}.`
			);
		}
		
		this._validateTooltipConfig(userEncoding, this.getMarks());
		
		this.validateVisSpecificEncoding(userEncoding);
		this._validateMarks(userEncoding);

		return userEncoding;
	}
	
	validateReferencedFields(encoding, sparqlVars = []) {
		this._validateReferencedFieldsExist(encoding, sparqlVars);
	}
	
 	mergeEncoding(userEncoding) {
		throw new Error("mergeEncoding must be implemented by subclass");
	}
	
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
			
			const nestedChannels = this.getNestedMarkChannels(mark);
			
			for (const channel of Object.keys(nestedChannels || {})) {
				this._validateNestedField(encoding, mark, channel);
			}
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
