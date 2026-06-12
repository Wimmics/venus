import * as d3 from "d3";
import * as d3Chromatic from "d3-scale-chromatic";

// Optional CDN import kept for reference:
//import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
* Color scale calculator for visual encodings.
* Parses string ranges (for example: "Blues", "Blues[5]") to D3 schemes.
* Supports ordinal and quantitative scale types.
*/
export class ColorScaleCalculator {
	constructor() {}
	
	/**
	* Validate whether a color token is recognized.
	* Supports hex, rgb/rgba, hsl/hsla, and common CSS color names.
	*
	* @param {string} color - Color token to validate
	* @returns {boolean} True if valid
	*/
	isValidColor(color) {
		if (typeof color !== 'string') return false;
		
		// Normalize whitespace.
		color = color.trim();
		
		// Validate hex colors (#rgb, #rrggbb).
		const hexPattern = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
		if (hexPattern.test(color)) return true;
		
		// Validate RGB/RGBA colors.
		const rgbPattern = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([01]|0?\.\d+))?\s*\)$/;
		const rgbMatch = color.match(rgbPattern);
		if (rgbMatch) {
			const [, r, g, b, a] = rgbMatch;
			// Validate RGB component bounds.
			if (parseInt(r) <= 255 && parseInt(g) <= 255 && parseInt(b) <= 255) {
				// If alpha exists, validate [0, 1].
				if (a === undefined || (parseFloat(a) >= 0 && parseFloat(a) <= 1)) {
					return true;
				}
			}
		}
		
		// Validate HSL/HSLA colors.
		const hslPattern = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*([01]|0?\.\d+))?\s*\)$/;
		const hslMatch = color.match(hslPattern);
		if (hslMatch) {
			const [, h, s, l, a] = hslMatch;
			// Validate HSL bounds.
			if (parseInt(h) <= 360 && parseInt(s) <= 100 && parseInt(l) <= 100) {
				// If alpha exists, validate [0, 1].
				if (a === undefined || (parseFloat(a) >= 0 && parseFloat(a) <= 1)) {
					return true;
				}
			}
		}
		
		// Validate common named CSS colors.
		const cssColors = [
			'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown',
			'black', 'white', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
			'maroon', 'olive', 'teal', 'silver', 'aqua', 'fuchsia', 'indigo',
			'violet', 'gold', 'coral', 'salmon', 'khaki', 'crimson', 'chocolate',
			'darkred', 'darkgreen', 'darkblue', 'darkorange', 'darkgray', 'darkgrey',
			'lightred', 'lightgreen', 'lightblue', 'lightyellow', 'lightgray', 'lightgrey',
			'steelblue', 'royalblue', 'forestgreen', 'orangered', 'tomato', 'dodgerblue'
		];
		
		return cssColors.includes(color.toLowerCase());
	}
	
	/**
	* Convert one RGB component to two-digit hex.
	* @param {number} c - RGB component (0-255)
	* @returns {string} Two-digit hex
	*/
	componentToHex(c) {
		const hex = c.toString(16);
		return hex.length == 1 ? "0" + hex : hex;
	}
	
	/**
	* Convert RGB components to a hex color string.
	* @param {number} r - Red (0-255)
	* @param {number} g - Green (0-255)
	* @param {number} b - Blue (0-255)
	* @returns {string} Hex color
	*/
	rgbToHex(r, g, b) {
		return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
	}
	
	/**
	* Convert a hex color to rgb(r, g, b) text.
	* @param {string} hex - Hex color
	* @returns {string} rgb(...) string
	*/
	hexToRgb(hex) {
		// Remove leading "#" if present.
		hex = hex.replace(/^#/, '');
		
		// Expand short form (#abc) to full form (#aabbcc).
		if (hex.length === 3) {
			hex = hex.split('').map(c => c + c).join('');
		}
		
		// Parse RGB components.
		let r = parseInt(hex.substring(0, 2), 16);
		let g = parseInt(hex.substring(2, 4), 16);
		let b = parseInt(hex.substring(4, 6), 16);
		
		return `rgb(${r}, ${g}, ${b})`;
	}
	
	/**
	* Parse a D3 color scheme name with optional index support (for example: "Blues[5]").
	* @param {string} input - Scheme name (for example: "Blues", "Blues[5]", "Category10")
	* @param {string} scaleType - Scale type ('ordinal' or 'quantitative')
	* @returns {object|null} {type: "interpolate"|"scheme", value: function|array, raw: string}
	*/
	parseD3ColorScheme(input, scaleType = 'ordinal') {
		const regex = /^([a-zA-Z0-9]+)(?:\[(\d+)\])?$/;
		const match = input.match(regex);
		
		if (!match) return null;
		
		const rawName = match[1];
		const normalizedRawName = rawName
		.replace(/^scheme/i, '')
		.replace(/^interpolate/i, '');
		const index = match[2] ? parseInt(match[2], 10) : null;
		
		// Try normalized name variations.
		const variations = [
			// First letter uppercase, rest lowercase.
			normalizedRawName.charAt(0).toUpperCase() + normalizedRawName.slice(1).toLowerCase(),
			// Uppercase.
			normalizedRawName.toUpperCase(),
			// As provided.
			normalizedRawName,
			// Lowercase.
			normalizedRawName.toLowerCase()
		];
		
		const resolveInterpolate = (name) => {
			const fullInterpolate = `interpolate${name}`;
			if (fullInterpolate in d3 && typeof d3[fullInterpolate] === "function") {
				return d3[fullInterpolate];
			}
			if (fullInterpolate in d3Chromatic && typeof d3Chromatic[fullInterpolate] === "function") {
				return d3Chromatic[fullInterpolate];
			}
			return null;
		};
		
		const resolveScheme = (name) => {
			const fullScheme = `scheme${name}`;
			let scheme = null;
			
			if (fullScheme in d3) {
				scheme = d3[fullScheme];
			} else if (fullScheme in d3Chromatic) {
				scheme = d3Chromatic[fullScheme];
			}
			
			if (!scheme || !Array.isArray(scheme)) return null;
			
			// Nested/sparse array (e.g. schemeBlues where some indexes are undefined
			// and valid palettes start later).
			const hasNestedPalettes = scheme.some((entry) => Array.isArray(entry));
			if (hasNestedPalettes) {
				if (index !== null && Array.isArray(scheme[index])) {
					return scheme[index];
				}
				
				for (let paletteIndex = scheme.length - 1; paletteIndex >= 0; paletteIndex -= 1) {
					if (Array.isArray(scheme[paletteIndex])) {
						return scheme[paletteIndex];
					}
				}
				return null;
			}
			
			// Flat array (e.g. schemeSet1)
			return scheme;
		};
		
		for (const normalizedName of variations) {
			if (scaleType === 'quantitative' || scaleType === 'sequential') {
				// Quantitative: prefer interpolators, allow ColorBrewer schemes as fallback.
				const interpolator = resolveInterpolate(normalizedName);
				if (interpolator) {
					return {
						type: "interpolate",
						value: interpolator,
						raw: rawName,
					};
				}
				
				const scheme = resolveScheme(normalizedName);
				if (scheme) {
					return {
						type: "scheme",
						value: scheme,
						raw: rawName,
					};
				}
			} else {
				// Ordinal: prefer schemes, allow interpolators via quantization.
				const scheme = resolveScheme(normalizedName);
				if (scheme) {
					return { type: "scheme", value: scheme, raw: rawName };
				}
				
				const interpolator = resolveInterpolate(normalizedName);
				if (interpolator) {
					return {
						type: "interpolate",
						value: interpolator,
						raw: rawName
					};
				}
			}
		}
		
		{
			const warningMessage = `D3 color scheme "${input}" not found for type "${scaleType}". See available schemes at: https://d3js.org/d3-scale-chromatic`;
			const warningKey = warningMessage;
			if (!this.warningCache.has(warningKey)) {
				console.warn(warningMessage);
				this.warningCache.add(warningKey);
			}
		}
		return null;
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
	
	/**
	* Create a color scale from domain and range settings.
	*
	* @param {object} config - {domain, range, scaleType, fallbackInterpolator, label}
	* @returns {Function} D3 color scale function
	*/
	createColorScale({ 
		domain, 
		range, 
		scaleType = 'ordinal',
		fallbackInterpolator = null,
		label = "Color" 
	}) {
		
		// Validate the input domain.
		if (!Array.isArray(domain) || domain.length === 0) {
			throw new Error(`Invalid or empty domain provided (${label}). Cannot create color scale.`)
			return null;
		}
		
		// Pick fallback if none is explicitly provided.
		const smartFallback = fallbackInterpolator || this.getBestFallback(scaleType, domain.length);
		
		// Compute final color range from user input.
		let finalRange = this._computeColorRange(range, scaleType, domain.length, smartFallback, label);
		
		// Final range validation.
		if (!Array.isArray(finalRange) || finalRange.length === 0) {
			console.warn(`Could not compute valid color range (${label}). Using smart fallback.`)
			finalRange = this._getFallbackRange(smartFallback, domain.length);
		}
		
		// Warn for range/domain length mismatch.
		if (finalRange.length < domain.length) {
			console.warn(`Color range shorter than domain (${label}): ${finalRange.length} < ${domain.length}. Colors will repeat.`)
		} else if (finalRange.length > domain.length) {
			console.warn(`Color range longer than domain (${label}): ${finalRange.length} > ${domain.length}. Extra colors ignored.`)
		}
		
		// Build the final scale instance.
		return this._createD3Scale(domain, finalRange, scaleType, range, label);
	}
	
	/**
	* Compute a color range from user input.
	* @private
	*/
	_computeColorRange(range, scaleType, domainLength, smartFallback, label) {
		// Case 1: no range provided -> use fallback.
		if (range === null || range === undefined) {
			return this._getFallbackRange(smartFallback, domainLength);
		}
		
		// Case 2: string range (palette/interpolator name).
		if (typeof range === 'string') {
			return this._parseStringRange(range, scaleType, domainLength, smartFallback, label);
		}
		
		// Case 3: array range (explicit color values).
		if (Array.isArray(range)) {
			return this._parseArrayRange(range, scaleType, domainLength, smartFallback, label);
		}
		
		// Case 4: unsupported range type.
		console.warn(`Unsupported range type (${label}): ${typeof range}. Using smart fallback.`)

		return this._getFallbackRange(smartFallback, domainLength);
	}
	
	/** Parse a string-based range. */
	_parseStringRange(range, scaleType, domainLength, smartFallback, label) {
		// Single literal colors are not valid scale ranges.
		// Use `color.value` for constant color and keep `scale.range` for palettes.
		if (this.isValidColor(range)) {
			console.warn(`Invalid scale range (${label}): "${range}" is a single color literal. Use "color.value" for constant color, or provide a palette name / color array in "scale.range".`)
			return this._getFallbackRange(smartFallback, domainLength);
		}
		
		const parsed = this.parseD3ColorScheme(range, scaleType);
		
		if (parsed?.type === "interpolate") {
			return d3.quantize(parsed.value, domainLength);
		} else if (parsed?.type === "scheme") {
			return parsed.value;
		} else {
			// Palette not found -> fallback (warning already emitted by parser).
			return this._getFallbackRange(smartFallback, domainLength);
		}
	}
	
	/** Parse an array-based range. */
	_parseArrayRange(range, scaleType, domainLength, smartFallback, label) {
		// Common mistake: one-element string array instead of plain string.
		if (range.length === 1 && typeof range[0] === 'string') {
			const potentialSchemeName = range[0];
			if (this.isValidColor(potentialSchemeName)) {
				console.warn(`Invalid scale range (${label}): ["${potentialSchemeName}"] is a single literal color. Use "color.value" for constant color, or provide at least 2 colors in "scale.range".`)
				return this._getFallbackRange(smartFallback, domainLength);
			}
			const parsed = this.parseD3ColorScheme(potentialSchemeName, scaleType);
			
			if (parsed !== null) {
				const message = `Unsupported range format: ["${potentialSchemeName}"]. ` +
				`To use a pre-existing palette, use the string directly: "${potentialSchemeName}". ` +
				`Arrays are reserved for explicit hexadecimal colors like ["#1f77b4", "#ff7f0e"].`;
				console.warn(message)
				
				// Auto-correct by parsing as a plain string range.
				return this._parseStringRange(potentialSchemeName, scaleType, domainLength, smartFallback, label);
			}
		}
		
		// Validate array colors.
		const validColors = [];
		const invalidColors = [];
		
		range.forEach(color => {
			if (this.isValidColor(color)) {
				validColors.push(color);
			} else {
				invalidColors.push(color);
			}
		});
		
		if (invalidColors.length > 0) {
			console.warn(`Invalid colors detected and removed (${label}): [${invalidColors.join(', ')}]. Valid colors kept: [${validColors.join(', ')}]`)
		}
		
		if (validColors.length > 1) {
			return validColors;
		} else if (validColors.length === 1) {
			console.warn(`Invalid scale range (${label}): a single color in array form is not supported for data-driven scales. Use "color.value" for constant color, or provide at least 2 colors in "scale.range".`)
			return this._getFallbackRange(smartFallback, domainLength);
		} else {
			console.warn(`No valid colors found in array range (${label}). Using smart fallback.`)
			return this._getFallbackRange(smartFallback, domainLength);
		}
	}
	
	/** Get fallback range from fallback definition. */
	_getFallbackRange(smartFallback, domainLength) {
		if (typeof smartFallback === 'function') {
			try {
				return d3.quantize(smartFallback, domainLength);
			} catch (error) {
				console.warn(`Error with fallback interpolator: ${error.message}. Using Category10.`)
				return d3.schemeCategory10.slice(0, Math.min(domainLength, 10));
			}
		} else if (Array.isArray(smartFallback)) {
			return smartFallback;
		} else {
			// Last-resort fallback.
			return d3.quantize(d3.interpolateViridis, domainLength);
		}
	}
	
	/** Build the final D3 scale object. */
	_createD3Scale(domain, finalRange, scaleType, originalRange) {
		// Cycle colors if range is shorter than domain.
		const finalColors = domain.map((_, i) => finalRange[i % finalRange.length]);
		
		// Create scale according to requested type.
		let scale;
		
		if (scaleType === 'quantitative' || scaleType === 'sequential') {
			// For quantitative scales, prefer d3.scaleSequential when possible.
			if (typeof originalRange === 'string') {
				const parsed = this.parseD3ColorScheme(originalRange, scaleType);
				if (parsed?.type === "interpolate") {
					// Build sequential scale from interpolator.
					scale = d3.scaleSequential(parsed.value)
					.domain([0, domain.length - 1]);
					
					// Wrap the scale to map from domain value to position index.
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
			
			// Fallback to ordinal if no interpolator is available.
			scale = d3.scaleOrdinal().domain(domain).range(finalColors);
		} else {
			// Default ordinal scale.
			scale = d3.scaleOrdinal().domain(domain).range(finalColors);
		}
		
		return scale;
	}
	
	/**
	* Return the D3 scale constructor for a scale type.
	* @param {string} type - Scale type ('ordinal', 'quantitative', 'sequential')
	* @returns {function} D3 scale constructor
	*/
	getD3Method(type) {
		switch (type) {
			case 'quantitative':
			case 'sequential':
			return d3.scaleSequential;
			case 'ordinal':
			default:
			return d3.scaleOrdinal;
		}
	}
	
	/**
	* Build a color palette by scheme name.
	* @param {string} name - Scheme name (for example: "Blues", "Blues[5]", "Category10")
	* @param {number} size - Requested palette size
	* @param {string} scaleType - Scale type ('ordinal' or 'quantitative')
	* @returns {Array} Color palette
	*/
	getColorPalette(name, size = 8, scaleType = 'ordinal') {
		const parsed = this.parseD3ColorScheme(name, scaleType);
		
		if (parsed?.type === "interpolate") {
			return d3.quantize(parsed.value, size);
		} else if (parsed?.type === "scheme") {
			const scheme = parsed.value;
			if (Array.isArray(scheme)) {
				return scheme.slice(0, size);
			}
		}
		
		// Type-aware fallback.
		const smartFallback = this.getBestFallback(scaleType, size);
		if (typeof smartFallback === 'function') {
			try {
				return d3.quantize(smartFallback, size);
			} catch (error) {
				console.warn(`Error with interpolator in getColorPalette: ${error.message}. Using Category10.`)
				return d3.schemeCategory10.slice(0, Math.min(size, 10));
			}
		} else if (Array.isArray(smartFallback)) {
			return smartFallback.slice(0, size);
		}
		
		// Last-resort fallback.
		try {
			return d3.quantize(d3.interpolateViridis, size);
		} catch (error) {
			console.warn(`Error with Viridis interpolator: ${error.message}. Using Category10.`)
			return d3.schemeCategory10.slice(0, Math.min(size, 10));
		}
	}
}
