import * as d3 from "d3";
import * as d3Chromatic from "d3-scale-chromatic";

import { SCALE_DEFAULTS, isValidCssColor } from "@wimmics/venus-core";

/**
* Color scale calculator for visual encodings.
* Parses string ranges (for example: "Blues", "Blues[5]") to D3 schemes.
* Supports ordinal and quantitative scale types.
*/
export class ColorScaleCalculator {
	constructor() {
		this.fallback = null
		const { schemeNameIndex, interpolateNameIndex } = this._buildD3ColorNameIndexes();
		this.schemeNameIndex = schemeNameIndex;
		this.interpolateNameIndex = interpolateNameIndex;
	}
	
	
	_buildD3ColorNameIndexes() {
		const schemeNameIndex = new Map();
		const interpolateNameIndex = new Map();
		
		const register = (source) => {
			for (const key of Object.keys(source)) {
				if (key.startsWith("scheme")) {
					const suffix = key.slice("scheme".length);
					if (!suffix) continue;
					schemeNameIndex.set(suffix.toLowerCase(), suffix);
				}
				
				if (key.startsWith("interpolate")) {
					const suffix = key.slice("interpolate".length);
					if (!suffix) continue;
					interpolateNameIndex.set(suffix.toLowerCase(), suffix);
				}
			}
		};
		
		register(d3);
		register(d3Chromatic);
		
		return { schemeNameIndex, interpolateNameIndex };
	}
	
	_normalizeColorToken(token) {
		return String(token || "")
		.trim()
		.replace(/^scheme/i, "")
		.replace(/^interpolate/i, "")
		.toLowerCase();
	}
	
	_getExportByName(prefix, canonicalSuffix) {
		const exportName = prefix + canonicalSuffix;
		if (exportName in d3) return d3[exportName];
		if (exportName in d3Chromatic) return d3Chromatic[exportName];
		return null;
	}
	
	
	/**
	* Parse a D3 color scheme name with optional index support (for example: "Blues[5]").
	* @param {string} input - Scheme name (for example: "Blues", "Blues[5]", "Category10")
	* @param {string} scaleType - Scale type ('ordinal' or 'quantitative')
	* @returns {object|null} {type: "interpolate"|"scheme", value: function|array, raw: string}
	*/
	
	parseD3ColorScheme(input, scaleType = SCALE_DEFAULTS.type) {
		const match = String(input || "").trim().match(/^([a-zA-Z0-9]+)(?:\[(\d+)\])?$/);
		if (!match) return null;
		
		const rawName = match[1];
		const index = match[2] ? parseInt(match[2], 10) : null;
		const normalizedKey = this._normalizeColorToken(rawName);
		
		const canonicalInterpolate = this.interpolateNameIndex.get(normalizedKey) || null;
		const canonicalScheme = this.schemeNameIndex.get(normalizedKey) || null;
		
		const resolveInterpolate = () => {
			if (!canonicalInterpolate) return null;
			const fn = this._getExportByName("interpolate", canonicalInterpolate);
			return typeof fn === "function" ? fn : null;
		};
		
		const resolveScheme = () => {
			if (!canonicalScheme) return null;
			const scheme = this._getExportByName("scheme", canonicalScheme);
			if (!Array.isArray(scheme)) return null;
			
			const hasNestedPalettes = scheme.some((entry) => Array.isArray(entry));
			if (!hasNestedPalettes) return scheme;
			
			if (index !== null && Array.isArray(scheme[index])) {
				return scheme[index];
			}
			
			for (let i = scheme.length - 1; i >= 0; i -= 1) {
				if (Array.isArray(scheme[i])) return scheme[i];
			}
			
			return null;
		};
		
		if (scaleType === "quantitative" || scaleType === "sequential") {
			const interpolator = resolveInterpolate();
			if (interpolator) return { type: "interpolate", value: interpolator, raw: rawName };
			
			const scheme = resolveScheme();
			if (scheme) return { type: "scheme", value: scheme, raw: rawName };
		} else {
			const scheme = resolveScheme();
			if (scheme) return { type: "scheme", value: scheme, raw: rawName };
			
			const interpolator = resolveInterpolate();
			if (interpolator) return { type: "interpolate", value: interpolator, raw: rawName };
		}
		
		return null;
	}	

		/** Build the final D3 scale object. */
	_createD3Scale(domain, finalRange, scaleType, originalRange) {
		// Repeat colors if range is shorter than domain.
		const finalColors = domain.map((_, i) => finalRange[i % finalRange.length]);
		
		if (typeof originalRange === 'string' && (scaleType === 'quantitative' || scaleType === 'sequential')) {
			
			// For quantitative scales, prefer d3.scaleSequential when possible.
			
			const parsed = this.parseD3ColorScheme(originalRange, scaleType);
			if (parsed?.type === "interpolate") {
				// Build sequential scale from interpolator.
				let scale = d3.scaleSequential(parsed.value)
				.domain([0, domain.length - 1]);
				
				// Adapt it to discrete domain values by mapping value to domain index.
				const originalScale = scale;
				scale = (value) => {
					const index = domain.indexOf(value);
					return index !== -1 ? originalScale(index) : originalScale(0);
				};
				scale.domain = () => domain;
				scale.range = () => finalColors;
				
				return scale;
			}
		} 
		
		return d3.scaleOrdinal().domain(domain).range(finalColors)
	}
	
	
	/**
	* Create a color scale from domain and range settings.
	*
	* @param {object} config - {domain, range, scaleType, fallbackInterpolator, label}
	* @returns {Function} D3 color scale function
	*/
	createColorScale({ 
		domain, 
		userRange, 
		scaleType = SCALE_DEFAULTS.type,
		field = null
	}) {
		
		// Validate the input domain.
		if (!Array.isArray(domain) || domain.length === 0) {
			throw new Error(`Invalid or empty domain provided (${field}). Cannot create color scale.`)
			return null;
		}
		
		if (Array.isArray(userRange) && domain.length > userRange.length) {
			console.warn(`Color mismatch: there are more data values for "${field}" than provided colors. Colors will repeat.`)
		} 
		
		// Used to generate default color array
		this.fallback = this.getBestFallback(scaleType, domain.length);
		
		// Compute final color range from user input.
		let finalRange = this._computeColorRange(userRange, scaleType, domain.length);
		
		// Final range validation.
		if (!Array.isArray(finalRange) || finalRange.length === 0) {
			finalRange = this._getFallbackRange(domain.length);
		}
		
		// Build the final scale instance.
		return this._createD3Scale(domain, finalRange, scaleType, userRange);
	}
	
	/**
	* Compute a color range from user input.
	* @private
	*/
	_computeColorRange(userRange, scaleType, domainLength) {
		
		// Case 1: string range (palette/interpolator name).
		if (typeof userRange === 'string') {
			return this._parseStringRange(userRange, scaleType, domainLength);
		}
		
		// Case 2: array range (explicit color values).
		if (Array.isArray(userRange)) {
			return this._parseArrayRange(userRange, domainLength);
		}
		
		// Default: when all the above fails, generate a default range.
		return this._getFallbackRange(domainLength);
	}
	
	/** Parse a string-based range. */
	_parseStringRange(userRange, scaleType, domainLength) {
		const parsed = this.parseD3ColorScheme(userRange, scaleType);
		
		if (parsed?.type === "interpolate") {
			return d3.quantize(parsed.value, domainLength);
		} else if (parsed?.type === "scheme") {
			return parsed.value;
		} else {
			// Palette not found -> fallback (warning already emitted by encoding manager).
			return this._getFallbackRange(domainLength);
		}
	}
	
	/** Parse an array-based range. */
	_parseArrayRange(userRange, domainLength) {
		// Validate array colors.
		const validColors = userRange.filter(d => isValidCssColor(d))
		
		if (validColors.length) {
			return validColors;
		} else if (validColors.length === 1) {
			return this._getFallbackRange(domainLength);
		}
	}
	
	/**
	* Choose a fallback palette/interpolator based on scale type and domain size.
	* @param {string} scaleType - Scale type ('ordinal' or 'quantitative')
	* @param {number} domainSize - Domain size
	* @returns {*} Fallback scheme array or interpolator function
	*/
	getBestFallback(scaleType, domainSize) {
		if (scaleType === 'quantitative' || scaleType === 'sequential') {
			// Quantitative defaults to a perceptual interpolator.
			return d3.interpolateViridis;
		} else {
			// Ordinal defaults to categorical palettes.
			if (domainSize <= 10) {
				return d3.schemeCategory10;
			} else if (domainSize <= 12) {
				return d3.schemeSet3;
			} else {
				// For many categories, generate colors from an interpolator.
				return d3.quantize(d3.interpolateViridis, domainSize);
			}
		}
	}
	
	/** Get fallback range from fallback definition. */
	_getFallbackRange(domainLength) {
		
		if (typeof this.fallback === "function") {
			return d3.quantize(this.fallback, domainLength);
		}
		
		if (Array.isArray(this.fallback)) {
			return this.fallback.slice(0, domainLength);
		}
		
		return d3.schemeCategory10.slice(0, Math.min(domainLength, 10));
	}
	

	
	/**
	* Build a color palette by scheme name.
	* @param {string} name - Scheme name (for example: "Blues", "Blues[5]", "Category10")
	* @param {number} size - Requested palette size
	* @param {string} scaleType - Scale type ('ordinal' or 'quantitative')
	* @returns {Array} Color palette
	*/
	getColorPalette(name, size = 8, scaleType = SCALE_DEFAULTS.type) {
		const parsed = this.parseD3ColorScheme(name, scaleType);
		
		if (parsed?.type === "interpolate") {
			return d3.quantize(parsed.value, size);
		}
		
		if (parsed?.type === "scheme" && Array.isArray(parsed.value)) {
			return parsed.value.slice(0, size);
		}
		
		try {
			const fallback = this.getBestFallback(scaleType, size);
			if (typeof fallback === "function") return d3.quantize(fallback, size);
			if (Array.isArray(fallback)) return fallback.slice(0, size);
		} catch (_) {
			// optional: no warn to avoid user-facing noise
		}
		
		return d3.schemeCategory10.slice(0, Math.min(size, 10));
	}
}
