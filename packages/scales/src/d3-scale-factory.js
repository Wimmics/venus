import * as d3 from "d3";
import {
	SCALE_TYPES,
	normalizeScaleType,
	isQuantitativeScaleType
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
	
	createScale({ scaleConfig, data, field, isColorScale = false } = {}) {
		console.log("scale config = ", scaleConfig)
		if (!scaleConfig) return null;
		
		const type = normalizeScaleType(scaleConfig.type);
		console.log("scale type = ", type)
		const isQuant = isQuantitativeScaleType(type);
		console.log("isQuant = ", isQuant)
		const domain = this.resolveDomain({
			scaleConfig,
			data,
			field,
			scaleType: isColorScale && isQuant ? SCALE_TYPES.THRESHOLD : type,
		});

		console.log("domain = ", domain)
		if (!Array.isArray(domain) || domain.length === 0) {
			return null;
		}
		
		if (isColorScale) {
			return this.createColorScale({
				scaleConfig,
				data,
				field,
				domain,
				scaleType: type,
				isQuant
			});
		}
		
		if (isQuant) {
			const thresholdScale = this.createThresholdScale({
				scaleConfig,
				domain,
				isColorScale: false
			});
			
			if (thresholdScale) return thresholdScale;
		}
		
		return this.createNonColorScale({
			scaleConfig, 
			data, 
			field,
			domain,
			scaleType: type
		});
	}
	
	resolveDomain({ scaleConfig, data, field, scaleType }) {
		const userDomain = scaleConfig.domain;
		console.log("[resolveDomain]", scaleConfig, field, scaleType )
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
		console.log("[createColorScale]")
		if (isQuant) {
			const thresholdScale = this.createThresholdScale({
				scaleConfig,
				domain,
				isColorScale: true
			});
			console.log("threshold scale = ", thresholdScale)
			
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