import * as d3 from "d3"

import { CartesianVisualArtifacts } from "./cartesian-visual-artifacts";
import { SCALE_TYPES } from "@wimmics/venus-core";


export class BarChartVisualArtifacts extends CartesianVisualArtifacts {

    _computeStackedYDomainFromChart(chart) {
		const bars = chart?.bars || []
		const maxTotal = d3.max(bars, (bar) => Number(bar?.y1) || 0) || 0;
		return [0, Math.max(1, maxTotal)];
	}

	_computeBarYDomainFromChart(chart) {
		const bars = chart?.bars || [];
		const maxValue = d3.max(bars, (bar) => Number(bar?.value) || 0) || 0;
		return [0, Math.max(1, maxValue)];
	}

	_createGroupScalesFromChart({ chart, range }) {

		const scales = new Map();

		for (const xValue of chart.xValues) {

			const domain = chart.bars
				.filter(bar => bar.x === xValue && bar.observed !== false)
				.map(bar => bar.sub);

			scales.set(
				xValue,
				d3.scaleBand()
					.domain(domain)
					.range(range)
					.padding(0.05)
			);
		}

		return {
			field: chart.groupField || chart.splitField,
			scales,
			scaleType: SCALE_TYPES.BAND
		};
	}

    _getChartMode(chart) {
		return chart?.mode || 'simple'
	}

	_isStacked(chart) {
		const mode = this._getChartMode(chart)
		return mode === "stacked" || mode === "normalize"
	}

	_resolveGroups({ chart, bandResult }) {

		return this._getChartMode(chart) === "grouped"
			? this._createGroupScalesFromChart({
				chart,
				range: [0, bandResult.scale.bandwidth()]
			})
			: null;
	}

    _getAxesDomain({ chart, isHorizontal }) {
        const categoryDomain = chart?.xValues || [];

        const valueDomain =
            this._getChartMode(chart) === "normalize"
            ? [0, 1]
            : this._isStacked(chart)
                ? this._computeStackedYDomainFromChart(chart)
                : this._computeBarYDomainFromChart(chart);
		
		return {
			x: { domain: isHorizontal ? valueDomain : categoryDomain },
			y: { domain: isHorizontal ? categoryDomain : valueDomain }
		}
        
    }

    _getScales( { encoding, range, domainResult, isHorizontal }) {
		const scales = { x: {}, y: {}}
		
		for (let key of Object.keys(scales)) {
			scales[key] = this.scaleFactory.createLayoutScale({
				scaleConfig: encoding?.[key]?.scale,
				range: range[key],
				fallbackType:
					key === "x"
					? (isHorizontal ? SCALE_TYPES.LINEAR : SCALE_TYPES.BAND)
					: (isHorizontal ? SCALE_TYPES.BAND : SCALE_TYPES.LINEAR),
				domainResult: domainResult[key]
			})
		}

		return scales
	}

    _resolveChartLayoutExtras({ encoding, chart, scaleResult, isHorizontal }) {
        return {
            group: this._resolveGroups({
                chart,
                bandResult: isHorizontal ? scaleResult.y : scaleResult.x
            }),
            stack: {
                enabled: this._isStacked(chart),
                normalized: this._getChartMode(chart) === "normalize",
                mode: chart?.stackMode || "none",
                groupField: chart?.groupField
            },
            isHorizontal
        };
    }

}