import { VisualArtifacts } from "./visual-artifacts";
import { SCALE_TYPES, CHANNEL_TYPES } from "@wimmics/venus-core";
import * as d3 from "d3"

export class CartesianVisualArtifacts extends VisualArtifacts {

	_processChartSpecificArtifacts() {
		const { encoding, data, chart, width, height } = this._payload;

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
		const finalMargin = {
			top: 20,
			right: 20,
			bottom: 50,
			left: 60,
			...(encoding?.margin || {})
		};
		
		const innerWidth = Math.max(1, Number(width || 800) - finalMargin.left - finalMargin.right);
		const innerHeight = Math.max(1, Number(height || 600) - finalMargin.top - finalMargin.bottom);
		
		const xField = chart?.xField || encoding?.x?.field;
		const yField = chart?.yField || encoding?.y?.field;
		
		const mode = chart?.mode || "simple";
		const stackMode = chart?.stackMode || "none";
		const groupField = chart?.groupField || null;
		const isStacked = mode === "stacked" || mode === "normalize";
		
		const xScaleConfig = {
			...(encoding?.x?.scale || {})
		};

		if (Array.isArray(chart?.xCategories) && chart.xCategories.length > 0) {
			xScaleConfig.domain = chart.xCategories;
		}

		const yScaleConfig = {
			...(encoding?.y?.scale || {})
		};

		if (mode === "normalize") {
			yScaleConfig.domain = [0, 1];
		} else if (isStacked) {
			yScaleConfig.domain = this._computeStackedYDomainFromChart(chart);
		} else {
			yScaleConfig.domain = this._computeBarYDomainFromChart(chart);
		}

		const xResult = this.scaleFactory.createLayoutScale({
			scaleConfig: xScaleConfig,
			data: rows,
			field: xField,
			range: [0, innerWidth],
			fallbackType: SCALE_TYPES.BAND
		});
		
		const yResult = this.scaleFactory.createLayoutScale({
			scaleConfig: yScaleConfig,
			data: rows,
			field: yField,
			range: [innerHeight, 0],
			fallbackType: SCALE_TYPES.LINEAR
		});
		
		const groupResult = mode === "grouped" && groupField && xResult?.scale?.bandwidth
		? this._createGroupScaleFromChart({
			chart,
			range: [0, xResult.scale.bandwidth()]
		})
		: null;
		
		this.layout = {
			margin: finalMargin,
			innerWidth,
			innerHeight,
			mode,
			stackMode,
			x: {
				field: xField,
				axis: encoding?.x?.axis || {},
				...xResult
			},
			y: {
				field: yField,
				axis: encoding?.y?.axis || {},
				...yResult
			},
			group: groupResult,
			stack: {
				enabled: isStacked,
				normalized: mode === "normalize",
				mode: stackMode,
				groupField
			}
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