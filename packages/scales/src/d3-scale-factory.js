import * as d3 from "d3";
import {
	SCALE_DEFAULTS,
	SCALE_TYPES,
	normalizeScaleType,
	isQuantitativeScaleType,
	isThresholdScaleType,
	isOrdinalScaleType,
	isCountScaleType
} from "@wimmics/venus-core";

import { DomainCalculator } from "./domain-calculator.js";
import { ColorScaleCalculator } from "./color-scale-calculator.js";
import { SizeRangeCalculator } from "./size-range-calculator.js";
import { BinBreaksCalculator } from "./bin-breaks-calculator.js";

export class D3ScaleFactory {
	constructor({
		domainCalculator = new DomainCalculator(),
		colorScaleCalculator = new ColorScaleCalculator(),
		sizeRangeCalculator = new SizeRangeCalculator(),
		binBreaksCalculator = new BinBreaksCalculator()
	} = {}) {
		this.domainCalculator = domainCalculator;
		this.colorScaleCalculator = colorScaleCalculator;
		this.sizeRangeCalculator = sizeRangeCalculator;
		this.binBreaksCalculator = binBreaksCalculator;
	}
	
	createScale({ scaleConfig = {}, data, field, isColorScale = false } = {}) {
		
		const type = normalizeScaleType(scaleConfig.type);
		const isQuant = isQuantitativeScaleType(type);
		
		const scaleTypeForDomain = isColorScale && isQuant ? SCALE_TYPES.THRESHOLD : type;
		const shouldUseThreshold = isThresholdScaleType(scaleTypeForDomain) || Boolean(scaleConfig.binning);
		const isThreshold = isThresholdScaleType(scaleTypeForDomain) && shouldUseThreshold
		
		const { domain, bounds } = this.resolveDomain({
			scaleConfig,
			data,
			field,
			scaleType: scaleTypeForDomain,
		});
		
		// If no domain, then cancel the operation
		if (!Array.isArray(domain) || domain.length === 0) return null;
		
		let scale = null
		let range = []
		
		if (isColorScale) {
			scale = this.createColorScale({
				scaleConfig,
				field,
				domain,
				isQuant
			});
		}
		else if (isQuant && shouldUseThreshold) {
			scale = this.createThresholdScale({ scaleConfig, domain, isColorScale: false }) 
		}
		else { 
			scale = this.createNonColorScale({scaleConfig, data, field, domain, scaleType: type });
		}
		
		if (!scale) return null
		
		range = typeof scale.range === "function" ? scale.range() : []
		
		
		return {
			scale,
			domain,
			range,
			scaleType: scaleTypeForDomain,
			isThreshold,
			samples: this.createLegendSamples({
				scale,
				domain,
				range,
				scaleType: scaleTypeForDomain,
				isThreshold,
				bounds
			})
		};
	}
	
	
	createLegendSamples({
		scale,
		domain,
		range,
		isThreshold,
		count = SCALE_DEFAULTS.BINNING.BINS,
		bounds = null
	}) {
		if (!scale || typeof scale !== "function") return [];
		
		if (isThreshold) {
			return this.createThresholdLegendSamples({
				domain,
				range,
				bounds
			});
		}
		
		return this.createContinuousLegendSamples({
			scale,
			domain,
			count
		});
	}
	
	createThresholdLegendSamples({ domain, range, bounds = null }) {
		if (!Array.isArray(domain)) return [];
		
		const binCount = domain.length + 1;
		const visualRange = this._expandRangeToBins(range, binCount);
		
		const min = bounds?.min ?? null;
		const max = bounds?.max ?? null;
		
		return visualRange.map((visualValue, index) => {
			const lower = index === 0 ? min : domain[index - 1];
			const upper = index === visualRange.length - 1 ? max : domain[index];
			
			return {
				label: this._formatThresholdLabel(lower, upper, {
					includeLower: true,
					includeUpper: index === visualRange.length - 1
				}),
				value: visualValue,
				lower,
				upper,
				isThreshold: true,
				isFirst: index === 0,
				isLast: index === visualRange.length - 1
			};
		});
	}
	
	_expandRangeToBins(range, binCount) {
		if (!Array.isArray(range) || range.length === 0 || binCount <= 0) {
			return [];
		}
		
		if (range.length === binCount) {
			return range;
		}
		
		const min = Number(range[0]);
		const max = Number(range[range.length - 1]);
		
		if (!Number.isFinite(min) || !Number.isFinite(max)) {
			return range.slice(0, binCount);
		}
		
		return Array.from({ length: binCount }, (_, index) => {
			const t = binCount === 1 ? 0 : index / (binCount - 1);
			return min + (max - min) * t;
		});
	}
	
	createContinuousLegendSamples({ scale, domain, count }) {
		if (!Array.isArray(domain) || domain.length < 2) {
			return domain.map((domainValue) => ({
				label: String(domainValue),
				value: scale(domainValue),
				domainValue,
				isThreshold: false
			}));
		}
		
		const min = Number(domain[0]);
		const max = Number(domain[domain.length - 1]);
		
		if (!Number.isFinite(min) || !Number.isFinite(max)) {
			return domain.map((domainValue) => ({
				label: String(domainValue),
				value: scale(domainValue),
				domainValue,
				isThreshold: false
			}));
		}
		
		return Array.from({ length: count }, (_, index) => {
			const t = count === 1 ? 0 : index / (count - 1);
			const domainValue = min + (max - min) * t;
			
			return {
				label: String(Math.round(domainValue)),
				value: scale(domainValue),
				domainValue,
				isThreshold: false
			};
		});
	}
	
	_formatThresholdLabel(lower, upper, { includeLower = true, includeUpper = false } = {}) {
		const format = (value) => {
			if (value === null || value === undefined) return "?";
			const number = Number(value);
			return Number.isFinite(number) ? String(Math.round(number)) : String(value);
		};
		
		const left = includeLower ? "[" : "(";
		const right = includeUpper ? "]" : ")";
		
		return `${left}${format(lower)}, ${format(upper)}${right}`;
	}
	
	
	createColorScale({ scaleConfig, field, domain, isQuant }) {
		if (isQuant) {
			const thresholdScale = this.createThresholdScale({
				scaleConfig,
				domain,
				isColorScale: true
			});
			
			if (thresholdScale) return thresholdScale;
			
		}
		
		return this.colorScaleCalculator.createColorScale({
			domain,
			range: scaleConfig.range || null,
			scaleType: isQuant ? SCALE_TYPES.QUANTITATIVE : SCALE_TYPES.ORDINAL,
			fallbackInterpolator: null,
			label: `Color[${field}]`
		});
	}
	
	createNonColorScale({ scaleConfig, data, field, domain, scaleType }) {
		const range = this.resolveRange({
			scaleConfig,
			data,
			field,
			scaleType
		});
		
		if (scaleType === SCALE_TYPES.LINEAR || scaleType === SCALE_TYPES.COUNT) {
			return d3.scaleLinear().domain(domain).range(range);
		}
		
		if (scaleType === SCALE_TYPES.SQRT) {
			return d3.scaleSqrt().domain(domain).range(range);
		}
		
		if (scaleType === SCALE_TYPES.LOG) {
			return d3.scaleLog().domain(domain).range(range);
		}
		
		if (scaleType === SCALE_TYPES.POW) {
			const exponent = Number.isFinite(scaleConfig.exponent)
			? Number(scaleConfig.exponent)
			: 1;
			
			return d3
			.scalePow()
			.exponent(exponent)
			.domain(domain)
			.range(range);
		}
		
		return d3.scaleOrdinal().domain(domain).range(range);
	}
	
	createThresholdScale({ scaleConfig, domain, isColorScale }) {
		if (!Array.isArray(domain) || domain.length === 0) return null;
		
		if (isColorScale) {
			const colors = this.colorScaleCalculator.getColorPalette(
				scaleConfig.range,
				domain.length + 1,
				SCALE_TYPES.QUANTITATIVE
			);
			
			return d3.scaleThreshold()
			.domain(domain)
			.range(colors);
		}
		
		const sizeRange = this.sizeRangeCalculator.createThresholdSizeRange({
			range: scaleConfig.range,
			bins: domain.length + 1
		});
		
		return d3.scaleThreshold()
		.domain(domain)
		.range(sizeRange);
	}
	
	createLayoutScale({
		scaleConfig = {},
		data,
		field,
		range,
		fallbackType = SCALE_TYPES.ORDINAL,
		domainResult = null
	} = {}) {
		const type = normalizeScaleType(scaleConfig.type, fallbackType);

		const { domain, bounds, bins } = domainResult || this.resolveDomain({
			scaleConfig,
			data,
			field,
			scaleType: type
		});
		
		if (!Array.isArray(domain) || domain.length === 0) return null;
		
		let scale;
		
		if (type === SCALE_TYPES.LINEAR) {
			scale = d3.scaleLinear().domain(domain).nice().range(range);
		} else if (type === SCALE_TYPES.SQRT) {
			scale = d3.scaleSqrt().domain(domain).nice().range(range);
		} else if (type === SCALE_TYPES.LOG) {
			scale = d3.scaleLog().domain(domain).range(range);
		} else if (type === SCALE_TYPES.POW) {
			scale = d3.scalePow()
				.exponent(Number.isFinite(scaleConfig.exponent) ? Number(scaleConfig.exponent) : 1)
				.domain(domain)
				.range(range);
		} else if (type === SCALE_TYPES.BAND) {
			scale = d3.scaleBand()
				.domain(domain)
				.range(range)
				.padding(scaleConfig.padding ?? 0.1);
		} else {
			scale = d3.scalePoint()
				.domain(domain)
				.range(range)
				.padding(scaleConfig.padding ?? 0.5);
		}

		return {
			scale,
			domain,
			range,
			bounds,
			bins,
			scaleType: type
		};
	}
	
	createAxis({ scale, orientation, axisConfig = {}, field, scaleType, tickValues = null }) {
		if (!scale || !orientation) return null;

		const generator =
			orientation === "left"
			? d3.axisLeft(scale)
			: d3.axisBottom(scale);

		if (Array.isArray(tickValues) && tickValues.length) {
			generator.tickValues(tickValues);
		}
		
		generator.tickFormat(this._buildTickFormatter({ tickFormat: axisConfig?.tickFormat, scaleType }))

		return {
			orientation,
			generator,
			field,
			scaleType
		};
	}

	_normalizeTickFormatName(formatName) {
		return typeof formatName === "string" ? formatName.toLowerCase().trim() : "";
	}
	
	_buildTickFormatter({ tickFormat = "raw", scaleType = SCALE_TYPES.LINEAR }) {
		const format = this._normalizeTickFormatName(tickFormat);

		const asNumber = (value) => {
			const number = Number(value);
			return Number.isFinite(number) ? number : null;
		};

		if (isOrdinalScaleType(scaleType)) {
			return (value) => String(value);
		}

		if (isCountScaleType(scaleType) && (!format || format === "raw")) {
			return (value) => String(value);
		}

		if (!format || format === "raw") {
			return (value) => {
			const number = asNumber(value);
			return number === null ? String(value) : d3.format(",")(number);
			};
		}

		if (format === "integer" || format === "int") {
			return (value) => {
			const number = asNumber(value);
			return number === null ? String(value) : d3.format(",d")(Math.round(number));
			};
		}

		if (format === "percent" || format === "percentage") {
			return (value) => {
			const number = asNumber(value);
			return number === null ? String(value) : d3.format(".0%")(number);
			};
		}

		if (format === "compact") {
			const compact = new Intl.NumberFormat("en", {
			notation: "compact",
			maximumFractionDigits: 1
			});

			return (value) => {
			const number = asNumber(value);
			return number === null ? String(value) : compact.format(number);
			};
		}

		if (format === "kmb") {
			return (value) => {
			const number = asNumber(value);
			if (number === null) return String(value);

			const abs = Math.abs(number);
			if (abs >= 1e12) return `${d3.format(".2~f")(number / 1e12)}T`;
			if (abs >= 1e9) return `${d3.format(".2~f")(number / 1e9)}B`;
			if (abs >= 1e6) return `${d3.format(".2~f")(number / 1e6)}M`;
			if (abs >= 1e3) return `${d3.format(".2~f")(number / 1e3)}k`;
			return d3.format(".2~f")(number);
			};
		}

		if (format === "k" || format === "thousands") {
			return (value) => {
			const number = asNumber(value);
			return number === null ? String(value) : `${d3.format(".2~f")(number / 1e3)}k`;
			};
		}

		if (format === "m" || format === "millions") {
			return (value) => {
			const number = asNumber(value);
			return number === null ? String(value) : `${d3.format(".2~f")(number / 1e6)}M`;
			};
		}

		if (format === "b" || format === "billions") {
			return (value) => {
			const number = asNumber(value);
			return number === null ? String(value) : `${d3.format(".2~f")(number / 1e9)}B`;
			};
		}

		return (value) => {
			const number = asNumber(value);
			return number === null ? String(value) : d3.format(",")(number);
		};
	}

	
	resolveDomain({ scaleConfig, data, field, scaleType }) {
		const userDomain = scaleConfig.domain;
		let domainResult = null
		if (Array.isArray(data) && data.length > 0 && field) {
			domainResult = this.domainCalculator.getDomain(
				data,
				field,
				userDomain,
				scaleType, 
				scaleConfig.binning
			);
		}
		
		else if (Array.isArray(userDomain)) {
			domainResult = { 
				domain: userDomain, 
				bounds: { 
					min: Math.min(...userDomain), 
					max: Math.max(...userDomain) }, 
					bins: null
				}
		}
			
		return domainResult;
	}
		
	resolveRange({ scaleConfig, data, field, scaleType }) {
		const userRange = scaleConfig.range;
		
		if (!isQuantitativeScaleType(scaleType)) {
			return Array.isArray(userRange) ? userRange : [];
		}
		
		return this.sizeRangeCalculator.createSizeRange({
			data,
			field,
			scaleType,
			range: userRange,
			label: `Size[${field}]`
		});
	}
}
