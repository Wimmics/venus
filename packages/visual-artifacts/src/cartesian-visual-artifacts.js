import { VisualArtifacts } from "./visual-artifacts";
import { SCALE_TYPES } from "@wimmics/venus-core";
import * as d3 from "d3"

export class CartesianVisualArtifacts extends VisualArtifacts {

	_processChartSpecificArtifacts() {
		const { encoding, data, chart, width, height } = this._payload;

		console.log("bars encoding = ", encoding)

		const rows = Object.values(data)[0];
		
		this._processLayoutArtifacts({ 
			encoding, 
			rows: rows, 
			chart,
			width, 
			height 
		})
	}
	
	_processLayoutArtifacts({ encoding, rows, chart, width, height }) {
	
		const isHorizontal = encoding?.direction === "horizontal";

		// Resolve domains
		const domainResult = this._getAxesDomain({ encoding, data: rows, chart, isHorizontal })

		// Build axis specs from resolved domains
		const specsResult = this._getAxesSpecs({ encoding, domainResult })
		
		// Compute margin from axis specs
		const finalMargin = this._computeCartesianMargins({
			axes: {
				bottom: specsResult.x,
				left: specsResult.y
			},
			userMargin: encoding?.margin || {}
		});

		// Compute inner size and ranges
		const innerWidth = Math.max(1, Number(width || 800) - finalMargin.left - finalMargin.right);
		const innerHeight = Math.max(1, Number(height || 600) - finalMargin.top - finalMargin.bottom);

		specsResult.x.titlePosition = this._computeAxisTitlePosition({ axisSpec: specsResult.x, side: "bottom", innerWidth, innerHeight})
		specsResult.y.titlePosition = this._computeAxisTitlePosition({ axisSpec: specsResult.y, side: "left", innerHeight, innerHeight})

		const range = {
			x: [0, innerWidth],
			y: isHorizontal ? [0, innerHeight] : [innerHeight, 0]
		}

		// Create final scales using precomputed domain
		const scaleResult = this._getScales({ encoding, range, domainResult, isHorizontal })

		// Compute tick values according to chart dimensions
		const tickValuesResult = this._getTickValues({ encoding, scaleResult, dimensions: { x: innerWidth, y: innerHeight }})

		// Create axes
		const axesResult = this._getAxes({ encoding, scaleResult, tickValues: tickValuesResult })
		
		const stackMode = chart?.stackMode || "none";
		this.layout = {
			margin: finalMargin,
			innerWidth,
			innerHeight,
			mode: this._getChartMode(chart),
			stackMode,
			isHorizontal,
			x: {
				field: encoding?.x?.field,
				axis: encoding?.x?.axis || {},
				...scaleResult.x
			},
			y: {
				field: encoding?.y?.field,
				axis: encoding?.y?.axis || {},
				...scaleResult.y
			},
			axes: {
				bottom: { ...axesResult.x, ...specsResult.x },
				left: { ...axesResult.y, ...specsResult.y }
			},
			group: this._resolveGroups( { chart, bandResult: isHorizontal ? scaleResult.x : scaleResult.y } ),
			stack: {
				enabled: this._isStacked(chart),
				normalized: this._getChartMode(chart) === "normalize",
				mode: stackMode,
				groupField: chart?.groupField
			}
		};
	}

	_getChartMode(chart) {
		return chart?.mode || 'simple'
	}

	_isStacked(chart) {
		const mode = this._getChartMode(chart)
		return mode === "stacked" || mode === "normalize"
	}

	_resolveFallbackType( { isHorizontal, axis }) {
		if ( axis === "x" )
			return isHorizontal ? SCALE_TYPES.LINEAR : SCALE_TYPES.BAND
		else return isHorizontal ? SCALE_TYPES.BAND : SCALE_TYPES.LINEAR
	}

	_resolveGroups({ chart, bandResult }) {

		return this._getChartMode(chart) === "grouped" && chart?.groupField && bandResult?.scale?.bandwidth
			? this._createGroupScaleFromChart({
				chart,
				range: [0, bandResult.scale.bandwidth()]
			})
			: null;
	}

	_getAxes( { encoding, scaleResult, tickValues }) {
		const axes = { x: { orientation: "bottom"}, y: { orientation: "left"} }

		for (let key of Object.keys(axes)) {
			let orientation = axes[key].orientation
			axes[key] = this.scaleFactory.createAxis({
				scale: scaleResult?.[key]?.scale,
				orientation,
				axisConfig: encoding?.[key]?.axis || {},
				field: encoding?.[key]?.field,
				scaleType: encoding?.[key]?.scale?.type || scaleResult?.[key]?.scaleType,
				tickValues: tickValues?.[key]

			})
		}

		return axes
	}

	_getTickValues({ encoding, scaleResult, dimensions }) {
		const tickValues = { x: {}, y: {}}
		
		for (let key of Object.keys(tickValues)) {
			tickValues[key] = this._resolveAxisTickValues({
				scale: scaleResult?.[key]?.scale,
				scaleType: encoding?.[key]?.scale?.type || scaleResult?.[key]?.scaleType,
				availableSize: dimensions[key],
				axisConfig: encoding?.[key]?.axis || {}
			})

		}

		return tickValues
	}

	_getScales( { encoding, range, domainResult, isHorizontal = false }) {
		const scales = { x: {}, y: {}}
		
		for (let key of Object.keys(scales)) {
			scales[key] = this.scaleFactory.createLayoutScale({
				range: range[key],
				fallbackType: this._resolveFallbackType({ isHorizontal, axis: key }),
				domainResult: domainResult[key]
			})
		}

		return scales
	}

	_getAxesSpecs({ encoding, domainResult }) {
		let specs = { x: {}, y: {} }
		for (let key of Object.keys(specs)) {
			specs[key] = this._resolveAxisSpec({
				axisConfig: encoding?.[key]?.axis || {},
				field: encoding?.[key]?.field || null,
				tickLabels: domainResult?.[key]?.domain || []
			})
		}
		return specs
	}

	_getAxesDomain({ encoding, data, chart, isHorizontal = false }) {
		const xScaleConfig = encoding?.x?.scale || {}
		const yScaleConfig = encoding?.y?.scale || {}

		const categoryScaleConfig = isHorizontal ? yScaleConfig : xScaleConfig;
		const valueScaleConfig = isHorizontal ? xScaleConfig : yScaleConfig;

		categoryScaleConfig.domain = chart?.xCategories || [];

		if (this._getChartMode(chart) === "normalize") {
			valueScaleConfig.domain = [0, 1];
		} else if (this._isStacked(chart)) {
			valueScaleConfig.domain = this._computeStackedYDomainFromChart(chart);
		} else {
			valueScaleConfig.domain = this._computeBarYDomainFromChart(chart);
		}

		return {
			x: this.scaleFactory.resolveDomain({
				scaleConfig: categoryScaleConfig,
				data,
				field: encoding?.x?.field || null,
				scaleType: encoding?.x?.scale?.type || this._resolveFallbackType( { isHorizontal, axis: "x"})
			}),
			y: this.scaleFactory.resolveDomain({
				scaleConfig: valueScaleConfig,
				data,
				field: encoding?.y?.field || null,
				scaleType: encoding?.y?.scale?.type || this._resolveFallbackType( { isHorizontal, axis: "y" })
			})
		}
	}

	_resolveAxisTickValues({ scale, scaleType, availableSize, axisConfig = {} }) {
		if (Array.isArray(axisConfig.tickValues)) {
			return axisConfig.tickValues;
		}

		// Quantitative scales with explicit tick step
		const tickStep = Number(axisConfig.tickStep);

		if (
			Number.isFinite(tickStep) &&
			tickStep > 0 &&
			scaleType !== SCALE_TYPES.BAND &&
			scaleType !== SCALE_TYPES.POINT
		) {
			const domain = typeof scale?.domain === "function" ? scale.domain() : [];

			if (domain.length < 2) return null;

			const start = Number(domain[0]);
			const end = Number(domain[domain.length - 1]);

			const firstTick = Math.ceil(start / tickStep) * tickStep;

			const ticks = [];
			for (let value = firstTick; value <= end + tickStep * 1e-9; value += tickStep) {
				ticks.push(Number(value.toFixed(12)));
			}

			return ticks;
		}

		// Default count behavior
		if (
			scaleType === SCALE_TYPES.COUNT &&
			!Number.isFinite(tickStep)
		) {
			const domain = typeof scale?.domain === "function" ? scale.domain() : [];

			if (domain.length < 2) return null;

			const start = Math.ceil(domain[0]);
			const end = Math.floor(domain[1]);

			return d3.range(start, end + 1);
		}

		// Categorical label skipping
		if (scaleType !== SCALE_TYPES.BAND && scaleType !== SCALE_TYPES.POINT) {
			return null;
		}

		const domain = typeof scale?.domain === "function" ? scale.domain() : [];

		const minLabelSpacing = Number(axisConfig.minLabelSpacing ?? 40);
		const maxTicks = Math.max(1, Math.floor(availableSize / minLabelSpacing));

		if (domain.length <= maxTicks) return domain;

		const step = Math.ceil(domain.length / maxTicks);
		return domain.filter((_, index) => index % step === 0);
	}

	_resolveAxisSpec({ axisConfig = {}, field = null, tickLabels = [] } = {}) {
		
		return {
			title: this._resolveAxisTitle(axisConfig, field),
			labelAngle: Number(axisConfig.labelAngle ?? axisConfig.tickAngle ?? 0),
			labelOffset: this._normalizeOffset(axisConfig.labelOffset),
			tickLabels: Array.isArray(tickLabels) ? tickLabels : [],
			config: axisConfig
		}

	}

	

	_computeAxisTitlePosition({ axisSpec, side, innerWidth, innerHeight }) {
		const maxChars = Math.min(
			32,
			Math.max(0, ...(axisSpec.tickLabels || []).map((d) => String(d).length))
		);
		console.log(side, maxChars)

		const charWidth = 7;
		const textHeight = 12;
		const gap = 16;

		const labelAngle = Math.abs(Number(axisSpec.labelAngle || 0));
		const radians = (labelAngle * Math.PI) / 180;

		const labelWidth = maxChars * charWidth;
		const projectedHeight =
			labelAngle > 0
			? labelWidth * Math.sin(radians) + textHeight * Math.cos(radians)
			: textHeight;
		console.log(side, projectedHeight)
		if (side === "bottom") {
			return {
				x: innerWidth / 2,
				y: innerHeight + projectedHeight + gap,
				rotate: 0,
				textAnchor: "middle"
			};
		}

		if (side === "left") {
			const projectedWidth = labelWidth;

			return {
				x: -(projectedWidth + gap),
				y: innerHeight / 2,
				rotate: -90,
				textAnchor: "middle"
			};
		}

		return null;
	}

	_resolveAxisTitle(axisConfig, fieldFallback) {
		if (!axisConfig || typeof axisConfig !== "object") {
			return fieldFallback || "";
		}

		if (!Object.prototype.hasOwnProperty.call(axisConfig, "title")) {
			return fieldFallback || "";
		}

		const title = axisConfig.title;

		if (title === false) return "";

		if (title && typeof title === "object") {
			if (title.display === false) return "";
			if (Object.prototype.hasOwnProperty.call(title, "value")) {
			return title.value == null ? "" : String(title.value);
			}
			return "";
		}

		return title == null ? "" : String(title);
	}

	_normalizeOffset(offset) {
		if (!offset || typeof offset !== "object") {
			return { x: 0, y: 0 };
		}

		return {
			x: Number(offset.x ?? 0),
			y: Number(offset.y ?? 0)
		};
	}

	_computeAxisMarginRequirement(axis, side) {
		const titleSpace = axis?.title ? 28 : 0;
		const offset = axis?.labelOffset || { x: 0, y: 0 };
		const angle = Math.abs(Number(axis?.labelAngle || 0));

		const labels = axis?.tickLabels || [];
		const maxChars = Math.min(
			32,
			Math.max(0, ...labels.map((label) => String(label).length))
		);

		const estimatedTextWidth = maxChars * 7;
		const estimatedTextHeight = 12;

		if (side === "bottom") {
			const rotatedHeight = angle
			? estimatedTextWidth * Math.sin((angle * Math.PI) / 180)
			: estimatedTextHeight;

			return Math.ceil(20 + rotatedHeight + Math.abs(offset.y) + titleSpace);
		}

		if (side === "left") {
			const rotatedWidth = angle
			? estimatedTextWidth * Math.cos((angle * Math.PI) / 180)
			: estimatedTextWidth;

			return Math.ceil(10 + rotatedWidth + Math.abs(offset.x) + titleSpace);
		}

		return 20;
	}

	_computeCartesianMargins({ axes, userMargin = {} }) {
		const base = { top: 20, right: 20, bottom: 50, left: 60 };

		return {
			top: userMargin.top ?? base.top,
			right: userMargin.right ?? base.right,
			bottom: userMargin.bottom ?? Math.max(
				base.bottom,
				this._computeAxisMarginRequirement(axes.bottom, "bottom")
			),
			left: userMargin.left ?? Math.max(
				base.left,
				this._computeAxisMarginRequirement(axes.left, "left")
			)
		};
	}
	
	_computeStackedYDomainFromChart(chart) {
		const bars = chart?.bars || [];

		const maxTotal = d3.max(bars, (bar) => Number(bar?.y1) || 0) || 0;

		return [0, Math.max(1, maxTotal)];
	}

	_computeBarYDomainFromChart(chart) {
		const bars = chart?.bars || [];
		const maxValue = d3.max(bars, (bar) => Number(bar?.value) || 0) || 0;
		return [0, Math.max(1, maxValue)];
	}

	_createGroupScaleFromChart({ chart, range }) {
		const domain = chart?.subCategories || [];
		
		const scale = d3.scaleBand()
			.domain(domain)
			.range(range)
			.padding(0.05);
		
		return {
			field: chart?.groupField || chart?.splitField || null,
			scale,
			domain,
			range,
			scaleType: SCALE_TYPES.BAND
		};
	}
}