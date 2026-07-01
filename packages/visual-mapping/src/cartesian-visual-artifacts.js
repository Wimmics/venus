import { VisualArtifacts } from "./visual-artifacts";
import { isCountScaleType, SCALE_TYPES } from "@wimmics/venus-core";
import * as d3 from "d3"

export class CartesianVisualArtifacts extends VisualArtifacts {

	_processChartSpecificArtifacts() {
		const { encoding, data, chart, width, height } = this._payload;
		
		this._processLayoutArtifacts({ 
			encoding, 
			rows: Object.values(data)[0], 
			chart,
			width, 
			height 
		})
	}
	
	_processLayoutArtifacts({ encoding, rows, chart, width, height }) {
		
		const isHorizontal = encoding?.direction === "horizontal";

		const layoutEncoding = isHorizontal ? { ...encoding, x: encoding.y, y: encoding.x } : encoding;

		// Resolve domains
		const domainResult = this._getAxesDomain({ encoding: layoutEncoding, data: rows, chart, isHorizontal })

		// Build axis specs from resolved domains
		const specsResult = this._getAxesSpecs({ encoding: layoutEncoding, domainResult })

		const { margin, innerHeight, innerWidth } = this._getChartSpace({ encoding: layoutEncoding, specs: specsResult, width, height })

		specsResult.x.titlePosition = this._computeAxisTitlePosition({ axisSpec: specsResult.x, side: "bottom", innerWidth, innerHeight})
		specsResult.y.titlePosition = this._computeAxisTitlePosition({ axisSpec: specsResult.y, side: "left", innerHeight, innerHeight})

		const range = {
			x: [0, innerWidth],
			y: isHorizontal ? [0, innerHeight] : [innerHeight, 0]
		}

		// Create final scales using precomputed domain
		const scaleResult = this._getScales({ encoding: layoutEncoding, range, domainResult, isHorizontal })

		// Compute tick values according to chart dimensions
		const tickValuesResult = this._getTickValues({ encoding: layoutEncoding, scaleResult, dimensions: { x: innerWidth, y: innerHeight }})

		// Create axes
		const axesResult = this._getAxes({ encoding: layoutEncoding, scaleResult, tickValues: tickValuesResult })
		
		// Layout specifics per chart
		const chartExtras = this._resolveChartLayoutExtras({ encoding: layoutEncoding, chart, scaleResult, isHorizontal });

		this.layout = {
			margin,
			innerWidth,
			innerHeight,
			mode: chart?.mode || null,
			x: { field: layoutEncoding?.x?.field, ...scaleResult.x },
			y: { field: layoutEncoding?.y?.field, ...scaleResult.y },
			axes: {
				bottom: { ...axesResult.x, ...specsResult.x },
				left: { ...axesResult.y, ...specsResult.y }
			},
			...chartExtras
		};
	}

	_getChartSpace({ encoding, specs, width, height }) {
		const bottomRequirement =
			this.chartSpaceManager.computeLabelRequirement({
				labels: specs.x.tickLabels,
				angle: specs.x.labelAngle,
				offset: specs.x.labelOffset,
				title: specs.x.title,
				orientation: "bottom"
			});

		const leftRequirement =
			this.chartSpaceManager.computeLabelRequirement({
				labels: specs.y.tickLabels,
				angle: specs.y.labelAngle,
				offset: specs.y.labelOffset,
				title: specs.y.title,
				orientation: "left"
			});

		return this.chartSpaceManager.computeChartSpace({
			width,
			height,
			userMargin: encoding?.margin,
			requirements: {
				bottom: bottomRequirement,
				left: leftRequirement
			}
		});
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

	_getScales( { encoding, range, domainResult }) {
		const scales = { x: {}, y: {}}
		
		for (let key of Object.keys(scales)) {
			scales[key] = this.scaleFactory.createLayoutScale({
				scaleConfig: encoding?.[key]?.scale,
				range: range[key],
				fallbackType: SCALE_TYPES.LINEAR, 
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

	

	_resolveAxisTickValues({ scale, scaleType, availableSize, axisConfig = {} }) {
		if (Array.isArray(axisConfig.tickValues)) {
			return axisConfig.tickValues;
		}

		const domain = typeof scale?.domain === "function" ? scale.domain() : [];
		const tickStep = Number(axisConfig.tickStep);

		// Categorical scales: preserve original domain values
		if (scaleType === SCALE_TYPES.BAND || scaleType === SCALE_TYPES.POINT) {
			if (Number.isFinite(tickStep) && tickStep > 0) {
			return domain.filter((value) => {
				const n = Number(value);
				return Number.isFinite(n) && n % tickStep === 0;
			});
			}

			const minLabelSpacing = Number(axisConfig.minLabelSpacing ?? 40);
			const maxTicks = Math.max(1, Math.floor(availableSize / minLabelSpacing));

			if (domain.length <= maxTicks) return domain;

			const step = Math.ceil(domain.length / maxTicks);
			return domain.filter((_, index) => index % step === 0);
		} 
		
		if (scaleType === SCALE_TYPES.COUNT) {
			if (domain.length < 2) return null;

			const step = Number.isFinite(tickStep) && tickStep > 0
				? tickStep
				: 1;

			const start = Math.ceil(Number(domain[0]) / step) * step;
			const end = Math.floor(Number(domain[domain.length - 1]));

			const ticks = [];
			for (let value = start; value <= end + step * 1e-9; value += step) {
				ticks.push(Number(value.toFixed(12)));
			}

			return ticks;
		}
		// Quantitative scales
		if (Number.isFinite(tickStep) && tickStep > 0) {
			if (domain.length < 2) return null;

			const start = Number(domain[0]);
			const end = Number(domain[domain.length - 1]);

			const firstTick = Math.ceil(start / tickStep) * tickStep;

			const ticks = [];
			for (let value = firstTick; value <= end + tickStep * 1e-9; value += tickStep) {
				ticks.push(Number(value.toFixed(12)));
			}

			return ticks
		}

		

		return null;
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
	
	_getAxesDomain({ encoding, data }) {
		const xScaleConfig = { ...(encoding?.x?.scale || {}) };
		const yScaleConfig = { ...(encoding?.y?.scale || {}) };

		return {
			x: this.scaleFactory.resolveDomain({
				scaleConfig: xScaleConfig,
				data,
				field: encoding?.x?.field || null,
				scaleType: xScaleConfig?.type || SCALE_TYPES.LINEAR
			}),
			y: this.scaleFactory.resolveDomain({
				scaleConfig: yScaleConfig,
				data,
				field: encoding?.y?.field || null,
				scaleType: yScaleConfig?.type || SCALE_TYPES.LINEAR
			})
		};
	}

	// If necessary, implemented by subclass
	_resolveChartLayoutExtras() {
  		return {};
	}
}