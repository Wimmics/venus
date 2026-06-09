/**
* Domain calculator used by visual encodings.
* It derives and validates domains from data and optional user input.
*/

import { isQuantitativeScaleType, isThresholdScaleType, SCALE_TYPES, SCALE_DEFAULTS } from "@wimmics/venus-core";
import { BinBreaksCalculator } from "./bin-breaks-calculator";

export class DomainCalculator {
	constructor({ binBreaksCalculator = new BinBreaksCalculator() } = {}) {
		this.binBreaksCalculator = binBreaksCalculator;
		
		// Cached domains per field.
		this.domainCache = new Map();
		// Cached field statistics.
		this.fieldStatsCache = new Map();
		
		this.maxListedValuesInWarnings = 12;
	}
	
	_formatValueList(values) {
		if (!Array.isArray(values) || values.length === 0) {
			return '';
		}
		const shownValues = values.slice(0, this.maxListedValuesInWarnings).map(v => String(v));
		const remainingCount = values.length - shownValues.length;
		return remainingCount > 0
		? `${shownValues.join(', ')}, ... (+${remainingCount} more)`
		: shownValues.join(', ');
	}
	
	/**
	* Main domain resolution entry point.
	* Handles automatic domain generation, invalid user domains, and incomplete domains.
	*
	* @param {Array} data - Graph data (nodes or links)
	* @param {string} field - Field name to analyze
	* @param {Array|null} userDomain - User-provided domain (can be null/undefined)
	* @param {string} scaleType - Scale type ('ordinal', 'linear', 'sqrt', 'log')
	* @returns {Array} Resolved domain for the field
	*/
	getDomain(data, field, userDomain = null, scaleType = SCALE_DEFAULTS.TYPE, binning = null) {
			
		if (!data || data.length === 0) {
			console.warn(`No data available for field "${field}"`);
			return {}
		}
		
		// Extract unique values for the requested field.
		const extractedValues = this.getVal(data, field);
		
		if (extractedValues.length === 0) {
			console.warn(`No values found in data for field "${field}"`);
			return {}
		}
		
		if (isThresholdScaleType(scaleType)) {
			return this._getThresholdDomain(extractedValues, field, userDomain, scaleType, binning) 
		}
		
		// Quantitative scales use continuous numeric domains (min/max), not categorical membership checks.
		if (isQuantitativeScaleType(scaleType)) {
			return this._getQuantitativeDomain(extractedValues, field, userDomain, scaleType);
		}
		
		// Case 1: no user domain provided -> use extracted values.
		if (!userDomain || userDomain.length === 0) {
			const reason = !userDomain ? "user domain not defined (null/undefined)" : "user domain empty (empty array)";
			
			const sortedDomain = this.sortDomainValues(extractedValues, scaleType);
			
			return { domain: sortedDomain }
		}
		
		// Case 2: invalid user domain -> fix it.
		const invalidityReport = this.analyzeDomainInvalidity(userDomain, extractedValues);
		if (invalidityReport.isInvalid) {
			const fixedDomain = this.fixDomain(userDomain, extractedValues, scaleType);
			
			// Emit a single consolidated warning with context.
			const warningParts = [
				`Invalid domain for field "${field}": ${invalidityReport.reason}`,
				`User provided: [${this._formatValueList(userDomain)}]`,
				`Data contains: [${this._formatValueList(extractedValues)}]`,
				`Domain corrected to: [${this._formatValueList(fixedDomain)}]`
			];
			console.warn(warningParts.join(' | '));
			
			return { domain: fixedDomain }
		}
		
		// Case 3: incomplete user domain -> complete it.
		const incompletenessReport = this.analyzeDomainIncompleteness(userDomain, extractedValues);
		if (incompletenessReport.isIncomplete) {
			const completedDomain = this.completeDomain(userDomain, extractedValues, scaleType);
			
			// Emit a single consolidated warning with context.
			const warningParts = [
				`Incomplete domain for field "${field}": Missing ${incompletenessReport.missingValues.length} values (coverage: ${Math.round(incompletenessReport.coverage * 100)}%)`,
				`User provided: [${this._formatValueList(userDomain)}]`,
				`Missing values: [${this._formatValueList(incompletenessReport.missingValues)}]`,
				`Domain completed to: [${this._formatValueList(completedDomain)}]`
			];
			console.warn(warningParts.join(' | '));
			
			return { domain: completedDomain }
		}
		
		// Case 4: valid user domain -> keep as is.
		return { domain: [...userDomain]} // Return a copy to avoid external mutation.
	}
		
		_isQuantitativeScale(scaleType) {
			return scaleType === 'linear' || scaleType === 'sqrt' || scaleType === 'log' || scaleType === 'quantitative' || scaleType === 'sequential' || scaleType === 'count';
		}
		
		_getQuantitativeDomain(extractedValues, field, userDomain, scaleType) {
			
			const numericValues = extractedValues
			.map(v => this.convertToNumber(v))
			.filter(v => !isNaN(v));
			
			if (numericValues.length === 0) {
				console.warn(`No numeric values found in data for field "${field}"`);
				return {}
			}
			
			const dataMin = Math.min(...numericValues);
			const dataMax = Math.max(...numericValues);
			const autoDomain = [dataMin, dataMax];
			
			if (!Array.isArray(userDomain) || userDomain.length < 2) {
				console.warn(`No valid numeric domain provided by user for field "${field}". Domain automatically generated from data extent: [${this._formatValueList(autoDomain)}].`);
				return { domain: autoDomain};
			}
			
			const userNumericValues = userDomain
			.map(v => this.convertToNumber(v))
			.filter(v => !isNaN(v));
			
			if (userNumericValues.length < 2) {
				console.warn(`Invalid numeric domain for field "${field}". User provided: [${this._formatValueList(userDomain)}]. Domain automatically generated from data extent: [${this._formatValueList(autoDomain)}].`);
				return {domain: autoDomain};
			}
			
			const userMin = Math.min(...userNumericValues);
			const userMax = Math.max(...userNumericValues);
			let finalDomain = [userMin, userMax];
			
			if (scaleType === 'log' && (finalDomain[0] <= 0 || finalDomain[1] <= 0)) {
				const positiveValues = numericValues.filter(v => v > 0);
				if (positiveValues.length < 2) {
					console.warn(`Log scale requires positive values for field "${field}". Falling back to [1, 10].`);
					return {domain: [1, 10]};
				}
				finalDomain = [Math.min(...positiveValues), Math.max(...positiveValues)];
				console.warn(`Invalid non-positive user domain for log scale on field "${field}". Domain corrected to positive data extent: [${this._formatValueList(finalDomain)}].`);
			}
			
			if (finalDomain[0] === finalDomain[1]) {
				finalDomain = [finalDomain[0], finalDomain[0] + 1];
				console.warn(`Degenerate numeric domain for field "${field}" (min=max). Domain expanded to: [${this._formatValueList(finalDomain)}].`);
			}
			
			return { domain: finalDomain }
		}
		
		_getThresholdDomain(extractedValues, field, userDomain, scaleType, binning = {}) {
			const numericValues = extractedValues
			.map((value) => this.convertToNumber(value))
			.filter((value) => Number.isFinite(value));
			
			if (numericValues.length === 0) return [];
			
			const dataMin = Math.min(...numericValues);
			const dataMax = Math.max(...numericValues);
			
			const domainValues = Array.isArray(userDomain)
			? userDomain.map((v) => this.convertToNumber(v)).filter(Number.isFinite)
			: [];
			
			const min = domainValues.length >= 2 ? Math.min(...domainValues) : dataMin;
			const max = domainValues.length >= 2 ? Math.max(...domainValues) : dataMax;
			
			const method = typeof binning?.method === "string" && binning.method.trim()
			? binning.method
			: SCALE_DEFAULTS.BINNING.METHOD;
			
			const bins = Number.isInteger(binning?.bins) && binning.bins > 0
			? binning.bins
			: SCALE_DEFAULTS.BINNING.BINS;
			
			const breaks = Array.isArray(binning?.breaks)
			? binning.breaks
			: null;
			
			const breakInfo = this.binBreaksCalculator.computeBreaks(numericValues, {
				method,
				bins,
				breaks,
				label: field,
				quantitative: true,
				min,
				max
			})
			
			return {
				domain: breakInfo.thresholds,
				bounds: {
					min: breakInfo.min,
					max: breakInfo.max
				},
				bins: breakInfo.bins
			};
		}
		
		/**
		* Extract all unique values for a field from raw data.
		*
		* @param {Array} data - Raw input data
		* @param {string} field - Field name
		* @returns {Array} Unique values
		*/
		getVal(data, field) {
			const values = new Set();
			
			data.forEach((item, index) => {
				// Direct field extraction from raw records.
				const value = item[field];
				
				if (value !== null && value !== undefined && value !== '') {
					values.add(value);
				}
			});
			
			const result = Array.from(values);
			
			// Cache field stats for optional diagnostics.
			this.cacheFieldStats(field, result, data.length);
			
			return result;
		}
		
		/**
		* Sort domain values according to scale type.
		*
		* @param {Array} values - Values to sort
		* @param {string} scaleType - Scale type
		* @returns {Array} Sorted values
		*/
		sortDomainValues(values, scaleType) {
			if (scaleType === 'ordinal') {
				// Alphanumeric sort for ordinal scales.
				return [...values].sort((a, b) => {
					if (typeof a === 'string' && typeof b === 'string') {
						return a.localeCompare(b, 'fr', { numeric: true });
					}
					return String(a).localeCompare(String(b), 'fr', { numeric: true });
				});
			} else {
				// Numeric sort for quantitative scales.
				return [...values].sort((a, b) => {
					const numA = this.convertToNumber(a);
					const numB = this.convertToNumber(b);
					return numA - numB;
				});
			}
		}
		
		/**
		* Analyze whether a user domain is valid against extracted data values.
		*
		* @param {Array} userDomain - User-provided domain
		* @param {Array} extractedValues - Values extracted from data
		* @returns {Object} Detailed validity report
		*/
		analyzeDomainInvalidity(userDomain, extractedValues) {
			if (!Array.isArray(userDomain)) {
				return {
					isInvalid: true,
					reason: "User domain is not an array",
					invalidValues: [userDomain],
					validValues: [],
					totalUserValues: userDomain ? 1 : 0
				};
			}
			
			const validValues = [];
			const invalidValues = [];
			
			userDomain.forEach(domainValue => {
				const isValid = extractedValues.some(dataValue => this.valuesAreEqual(domainValue, dataValue));
				if (isValid) {
					validValues.push(domainValue);
				} else {
					invalidValues.push(domainValue);
				}
			});
			
			const isInvalid = validValues.length === 0;
			
			let reason = "";
			if (isInvalid) {
				if (invalidValues.length === userDomain.length) {
					reason = "No values in user domain match the data";
				} else {
					reason = `${invalidValues.length}/${userDomain.length} values in user domain do not match the data`;
				}
			}
			
			return {
				isInvalid,
				reason,
				invalidValues,
				validValues,
				totalUserValues: userDomain.length,
				validityRate: validValues.length / userDomain.length
			};
		}
		
		/**
		* Analyze whether a user domain fully covers extracted data values.
		*
		* @param {Array} userDomain - User-provided domain
		* @param {Array} extractedValues - Values extracted from data
		* @returns {Object} Detailed completeness report
		*/
		analyzeDomainIncompleteness(userDomain, extractedValues) {
			if (!Array.isArray(userDomain)) {
				return {
					isIncomplete: false,
					missingValues: [],
					existingValues: [],
					coverage: 0
				};
			}
			
			const existingValues = [];
			const missingValues = [];
			
			extractedValues.forEach(dataValue => {
				const exists = userDomain.some(domainValue => this.valuesAreEqual(domainValue, dataValue));
				if (exists) {
					existingValues.push(dataValue);
				} else {
					missingValues.push(dataValue);
				}
			});
			
			const coverage = existingValues.length / extractedValues.length;
			const isIncomplete = missingValues.length > 0;
			
			return {
				isIncomplete,
				missingValues,
				existingValues,
				coverage,
				totalDataValues: extractedValues.length,
				missingCount: missingValues.length
			};
		}
		
		/**
		* Convenience check: returns true when user domain is invalid.
		*
		* @param {Array} userDomain - User-provided domain
		* @param {Array} extractedValues - Values extracted from data
		* @returns {boolean} True if invalid
		*/
		isDomainInvalid(userDomain, extractedValues) {
			const report = this.analyzeDomainInvalidity(userDomain, extractedValues);
			return report.isInvalid;
		}
		
		/**
		* Convenience check: returns true when user domain is incomplete.
		*
		* @param {Array} userDomain - User-provided domain
		* @param {Array} extractedValues - Values extracted from data
		* @returns {boolean} True if incomplete
		*/
		isDomainIncomplete(userDomain, extractedValues) {
			const report = this.analyzeDomainIncompleteness(userDomain, extractedValues);
			return report.isIncomplete;
		}
		
		/**
		* Replace an invalid domain with a sorted domain derived from data.
		*
		* @param {Array} invalidDomain - Invalid domain
		* @param {Array} extractedValues - Values extracted from data
		* @param {string} scaleType - Scale type
		* @returns {Array} Corrected domain
		*/
		fixDomain(invalidDomain, extractedValues, scaleType) {
			
			// Fully invalid domains are replaced by the full data-driven domain.
			return this.sortDomainValues(extractedValues, scaleType);
		}
		
		/**
		* Complete an incomplete domain while preserving user order.
		*
		* @param {Array} incompleteDomain - Incomplete domain
		* @param {Array} extractedValues - Values extracted from data
		* @param {string} scaleType - Scale type
		* @returns {Array} Completed domain
		*/
		completeDomain(incompleteDomain, extractedValues, scaleType) {
			
			// Keep user-provided order for existing domain values.
			const completedDomain = [...incompleteDomain];
			
			// Collect values that are present in data but missing from the user domain.
			const missingValues = extractedValues.filter(dataValue => 
				!incompleteDomain.some(domainValue => this.valuesAreEqual(domainValue, dataValue))
			);
			
			// Sort missing values based on scale type.
			const sortedMissingValues = this.sortDomainValues(missingValues, scaleType);
			
			// Append missing values at the end.
			completedDomain.push(...sortedMissingValues);
			
			return completedDomain;
		}
		
		/**
		* Compare values with loose numeric/string compatibility.
		*
		* @param {*} value1 - First value
		* @param {*} value2 - Second value
		* @returns {boolean} True when equivalent
		*/
		valuesAreEqual(value1, value2) {
			// Direct equality.
			if (value1 === value2) return true;
			
			// String equality to handle `"1"` vs `1`.
			if (String(value1) === String(value2)) return true;
			
			// Numeric equality when both sides can be parsed.
			const num1 = this.convertToNumber(value1);
			const num2 = this.convertToNumber(value2);
			if (!isNaN(num1) && !isNaN(num2) && num1 === num2) return true;
			
			return false;
		}
		
		/**
		* Convert a value to number when possible.
		*
		* @param {*} value - Input value
		* @returns {number} Parsed number or NaN
		*/
		convertToNumber(value) {
			if (typeof value === 'number') return value;
			if (typeof value === 'string') {
				const num = parseFloat(value);
				return isNaN(num) ? NaN : num;
			}
			return NaN;
		}
		
		/**
		* Cache field stats for optional diagnostics and reuse.
		*
		* @param {string} field - Field name
		* @param {Array} uniqueValues - Unique values found
		* @param {number} totalCount - Total number of records
		*/
		cacheFieldStats(field, uniqueValues, totalCount) {
			const stats = {
				uniqueValues: [...uniqueValues],
				uniqueCount: uniqueValues.length,
				totalCount: totalCount,
				coverage: uniqueValues.length / totalCount,
				lastUpdated: Date.now()
			};
			
			this.fieldStatsCache.set(field, stats);
		}
		
		/**
		* Read cached stats for a field.
		*
		* @param {string} field - Field name
		* @returns {Object|null} Stats object or null
		*/
		getFieldStats(field) {
			return this.fieldStatsCache.get(field) || null;
		}
		
		/**
		* Clear caches and force recalculation on next call.
		*/
		clearCache() {
			this.domainCache.clear();
			this.fieldStatsCache.clear();
		}
		
		/**
		* Generate a suggested numeric domain with evenly spaced steps.
		* Useful for linear/sqrt/log scales.
		*
		* @param {Array} data - Data to analyze
		* @param {string} field - Numeric field name
		* @param {number} steps - Number of suggested steps (default: 5)
		* @returns {Array} Suggested numeric domain
		*/
		generateNumericDomain(data, field, steps = 5) {
			const values = this.getVal(data, field)
			.map(v => this.convertToNumber(v))
			.filter(v => !isNaN(v));
			
			if (values.length === 0) return [];
			
			const min = Math.min(...values);
			const max = Math.max(...values);
			const step = (max - min) / (steps - 1);
			
			const domain = [];
			for (let i = 0; i < steps; i++) {
				domain.push(min + (step * i));
			}
			
			return domain;
		}
		
		/**
		* Analyze field characteristics and suggest a scale type.
		*
		* @param {Array} data - Data to analyze
		* @param {string} field - Field name
		* @returns {Object} Suggested scale type and stats
		*/
		analyzeFieldType(data, field) {
			const values = this.getVal(data, field);
			if (values.length === 0) {
				return {
					suggestedScale: 'ordinal',
					isNumeric: false,
					uniqueCount: 0,
					samples: []
				};
			}
			
			// Check if all values are numeric.
			const numericValues = values.map(v => this.convertToNumber(v)).filter(v => !isNaN(v));
			const isNumeric = numericValues.length === values.length;
			
			// Compute simple stats.
			const uniqueCount = values.length;
			const samples = values.slice(0, 5); // Small preview sample.
			
			// Suggest the most appropriate scale.
			let suggestedScale = 'ordinal';
			if (isNumeric) {
				if (uniqueCount <= 10) {
					suggestedScale = 'ordinal'; // Few numeric values -> treat as categories.
				} else {
					suggestedScale = 'linear'; // Many numeric values -> continuous scale.
				}
			}
			
			return {
				suggestedScale,
				isNumeric,
				uniqueCount,
				samples,
				coverage: uniqueCount / data.length
			};
		}
	} 
	