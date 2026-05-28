import * as d3 from "d3";
import {
	SCALE_TYPES,
	normalizeScaleType,
	isQuantitativeScaleType,
	isThresholdScaleType
} from "../scale-types.js";

import { SCALE_DEFAULTS } from "../scale-defaults.js";

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
		
		const domain = this.resolveDomain({
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
				data,
				field,
				domain,
				scaleType: type,
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
			isThreshold: isThresholdScaleType(scaleTypeForDomain) && shouldUseThreshold,
			samples: this.createLegendSamples({
				scale,
				domain,
				range,
				scaleType: scaleTypeForDomain,
				isThreshold: isThresholdScaleType(scaleTypeForDomain) && shouldUseThreshold
			})
		};
	}
	
	
	createLegendSamples({ scale, domain, range, isThreshold, count = SCALE_DEFAULTS.BINNING.BINS }) {
		if (!scale || typeof scale !== "function") return [];
		
		if (isThreshold) {
			return range.map((visualValue, index) => ({
				label: this._formatThresholdLabel(domain, index, range.length),
				value: visualValue
			}));
		}
		
		if (!Array.isArray(domain) || domain.length < 2) {
			return domain.map((domainValue) => ({
				label: String(domainValue),
				value: scale(domainValue)
			}));
		}
		
		const min = Number(domain[0]);
		const max = Number(domain[domain.length - 1]);
		
		if (!Number.isFinite(min) || !Number.isFinite(max)) {
			return domain.map((domainValue) => ({
				label: String(domainValue),
				value: scale(domainValue)
			}));
		}
		
		return Array.from({ length: count }, (_, index) => {
			const t = count === 1 ? 0 : index / (count - 1);
			const domainValue = min + (max - min) * t;
			
			return {
				label: String(Math.round(domainValue)),
				value: scale(domainValue)
			};
		});
	}
	
	_formatThresholdLabel(domain, index, rangeLength) {
		const lower = index === 0 ? null : domain[index - 1];
		const upper = index === rangeLength - 1 ? null : domain[index];
		
		const format = (value) =>
			value == null
		? "?"
		: Number.isFinite(Number(value))
		? String(Math.round(Number(value)))
		: String(value);
		
		if (lower == null) return `≤ ${format(upper)}`;
		if (upper == null) return `> ${format(lower)}`;
		
		return `[${format(lower)}, ${format(upper)}]`;
	}
	
	resolveDomain({ scaleConfig, data, field, scaleType }) {
		const userDomain = scaleConfig.domain;
		
		if (Array.isArray(data) && data.length > 0 && field) {
			return this.domainCalculator.getDomain(
				data,
				field,
				userDomain,
				scaleType, 
				scaleConfig.binning
			);
		}
		
		if (Array.isArray(userDomain)) {
			return userDomain;
		}
		
		return [];
	}
	
	createColorScale({ scaleConfig, data, field, domain, scaleType, isQuant }) {
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