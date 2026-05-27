import { createLogger } from "@wimmics/venus-core";

export class BinBreaksCalculator {
	constructor() {
		this.logger = createLogger("BinBreaksCalculator", { debug: false, level: "warn" });
		this.defaultMethod = "jenks";
		this.defaultBins = 5;
	}
	
	computeBreaks(values, {
		method = this.defaultMethod,
		bins = this.defaultBins,
		label = "Breaks",
		breaks = null,
		quantitative = true,
		min = null,
		max = null
	} = {}) {
		if (!quantitative) {
			return this._computeOrdinalBreaks(values, { breaks, bins, method });
		}
		
		const numericValues = (Array.isArray(values) ? values : [])
		.map((value) => Number(value))
		.filter((value) => Number.isFinite(value))
		.sort((a, b) => a - b);
		
		if (numericValues.length === 0) {
			this.logger.warn(`No numeric values available to compute bins (${label}).`);
			return { thresholds: [], bins: 1, method, min: null, max: null };
		}
		
		const usingManualBreaks = Array.isArray(breaks) && breaks.length > 0;
		const usingManualBounds = Number.isFinite(min) || Number.isFinite(max);
		const usingManualSettings = usingManualBreaks || usingManualBounds;
		
		const dataMin = numericValues[0];
		const dataMax = numericValues[numericValues.length - 1];
		const effectiveMin = Number.isFinite(min) ? Number(min) : dataMin;
		const effectiveMax = Number.isFinite(max) ? Number(max) : dataMax;
		const extentMin = Math.min(effectiveMin, effectiveMax);
		const extentMax = Math.max(effectiveMin, effectiveMax);
		
		const clippedValues = numericValues.filter((value) => value >= extentMin && value <= extentMax);
		const workingValues = clippedValues.length ? clippedValues : numericValues;
		const clippedOutCount = numericValues.length - clippedValues.length;
		const clippedLowCount = numericValues.filter((value) => value < extentMin).length;
		const clippedHighCount = numericValues.filter((value) => value > extentMax).length;
		
		const uniqueValues = [...new Set(workingValues)];
		const requestedBins = Number.isFinite(bins) ? Math.max(1, Math.floor(bins)) : this.defaultBins;
		const maxBins = Math.max(1, uniqueValues.length);
		const finalBins = Math.min(requestedBins, maxBins);
		const normalizedMethod = method === "quartiles" ? "quartiles" : "jenks";
		
		const providedThresholds = this._normalizeProvidedNumericBreaks(breaks, extentMin, extentMax);
		if (usingManualSettings && clippedOutCount > 0) {
			this.logger.warn(
				`Manual breaks clipping (${label}): ${clippedOutCount} values are outside the effective extent [${extentMin}, ${extentMax}] and will be assigned to edge bins (${clippedLowCount} below min, ${clippedHighCount} above max).`
			);
		}
		if (providedThresholds.length > 0) {
			return {
				thresholds: providedThresholds,
				bins: providedThresholds.length + 1,
				method: normalizedMethod,
				min: extentMin,
				max: extentMax
			};
		}
		
		if (finalBins === 1) {
			return { thresholds: [], bins: 1, method: normalizedMethod, min: extentMin, max: extentMax };
		}
		
		let thresholds;
		if (normalizedMethod === "quartiles") {
			thresholds = this._computeQuantileThresholds(uniqueValues, finalBins);
		} else {
			thresholds = this._computeJenksThresholds(uniqueValues, finalBins);
		}
		
		const dedupedThresholds = [...new Set(thresholds)]
		.filter((value) => Number.isFinite(value))
		.sort((a, b) => a - b)
		.filter((value) => value > extentMin && value < extentMax);
		return {
			thresholds: dedupedThresholds,
			bins: dedupedThresholds.length + 1,
			method: normalizedMethod,
			min: extentMin,
			max: extentMax
		};
	}
	
	_computeOrdinalBreaks(values, { breaks = null, bins = this.defaultBins, method = this.defaultMethod } = {}) {
		const rawValues = Array.isArray(values) ? values : [];
		const uniqueValues = [...new Set(rawValues)];
		const uniqueBreaks = Array.isArray(breaks) ? [...new Set(breaks)] : [];
		const requestedBins = Number.isFinite(bins) ? Math.max(1, Math.floor(bins)) : this.defaultBins;
		
		if (uniqueBreaks.length > 0) {
			return {
				thresholds: uniqueBreaks,
				bins: uniqueBreaks.length + 1,
				method
			};
		}
		
		if (uniqueValues.length <= 1 || requestedBins <= 1) {
			return { thresholds: [], bins: 1, method };
		}
		
		const step = uniqueValues.length / requestedBins;
		const thresholds = [];
		for (let index = 1; index < requestedBins; index += 1) {
			const boundary = uniqueValues[Math.min(uniqueValues.length - 1, Math.floor(step * index))];
			thresholds.push(boundary);
		}
		
		return {
			thresholds: [...new Set(thresholds)],
			bins: [...new Set(thresholds)].length + 1,
			method
		};
	}
	
	_normalizeProvidedNumericBreaks(breaks, min, max) {
		if (!Array.isArray(breaks) || breaks.length === 0) return [];
		const numericInput = breaks
		.map((value) => Number(value))
		.filter((value) => Number.isFinite(value))
		.sort((a, b) => a - b);
		
		const numericBreaks = numericInput.filter((value) => value > min && value < max);
		if (numericInput.length > numericBreaks.length) {
			this.logger.warn(
				`Manual breaks were clipped to the effective extent [${min}, ${max}]. Ignored ${numericInput.length - numericBreaks.length} break(s).`
			);
		}
		
		return [...new Set(numericBreaks)];
	}
	
	_computeQuantileThresholds(sortedValues, bins) {
		const thresholds = [];
		for (let i = 1; i < bins; i += 1) {
			const q = i / bins;
			thresholds.push(this._quantileSorted(sortedValues, q));
		}
		return thresholds;
	}
	
	_quantileSorted(sortedValues, q) {
		if (sortedValues.length === 0) return NaN;
		if (q <= 0) return sortedValues[0];
		if (q >= 1) return sortedValues[sortedValues.length - 1];
		
		const position = (sortedValues.length - 1) * q;
		const lower = Math.floor(position);
		const upper = Math.ceil(position);
		if (lower === upper) return sortedValues[lower];
		
		const weight = position - lower;
		return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
	}
	
	_computeJenksThresholds(sortedValues, bins) {
		const n = sortedValues.length;
		const lowerClassLimits = Array.from({ length: n + 1 }, () => Array(bins + 1).fill(0));
		const varianceCombinations = Array.from({ length: n + 1 }, () => Array(bins + 1).fill(Infinity));
		
		for (let i = 1; i <= bins; i += 1) {
			lowerClassLimits[1][i] = 1;
			varianceCombinations[1][i] = 0;
			for (let j = 2; j <= n; j += 1) {
				varianceCombinations[j][i] = Infinity;
			}
		}
		
		for (let l = 2; l <= n; l += 1) {
			let sum = 0;
			let sumSquares = 0;
			let w = 0;
			
			for (let m = 1; m <= l; m += 1) {
				const lowerClassLimit = l - m + 1;
				const value = sortedValues[lowerClassLimit - 1];
				
				w += 1;
				sum += value;
				sumSquares += value * value;
				
				const variance = sumSquares - (sum * sum) / w;
				
				if (lowerClassLimit !== 1) {
					for (let j = 2; j <= bins; j += 1) {
						if (varianceCombinations[l][j] >= variance + varianceCombinations[lowerClassLimit - 1][j - 1]) {
							lowerClassLimits[l][j] = lowerClassLimit;
							varianceCombinations[l][j] = variance + varianceCombinations[lowerClassLimit - 1][j - 1];
						}
					}
				}
			}
			
			lowerClassLimits[l][1] = 1;
			varianceCombinations[l][1] = sumSquares - (sum * sum) / w;
		}
		
		const thresholds = [];
		let k = n;
		for (let j = bins; j > 1; j -= 1) {
			const classIndex = lowerClassLimits[k][j] - 1;
			thresholds.unshift(sortedValues[classIndex]);
			k = lowerClassLimits[k][j] - 1;
		}
		
		return thresholds;
	}
}
