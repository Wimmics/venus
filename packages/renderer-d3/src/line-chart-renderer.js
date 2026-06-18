import * as d3 from "d3";
import CartesianChartRenderer from "./cartesian-chart-renderer.js";

import { isQuantitativeScaleType, MARK_TYPES } from "@wimmics/venus-core";

export default class LineChartRenderer extends CartesianChartRenderer {
	
	_renderVis() {
		const layout = this.visualArtifacts?.layout;
		const chart = this._state?.payload?.chart || this.chart;
		
		if (!layout?.x?.scale || !layout?.y?.scale || !chart) {
			return false;
		}
		
		this._retrieveMarkChannels({marks: [ MARK_TYPES.LINES, MARK_TYPES.POINTS ]})
		
		this._renderAxes({ layout }) // implemented in parent class

		this._renderLines( { layout, series: chart?.series })

		if (layout.pointsEnabled) this._renderPoints( { layout, points: chart?.points })

		this._setInteractions()
	}

	_renderLines({ layout, series = []}) {
		const { x, y } = layout

		const getX = (d) => {
			const value =  isQuantitativeScaleType(x?.scaleType) ? Number(d.x) : String(d.x)
			return x.scale(value)
		} 

		const getY = (d) => y.scale(Number(d.y))

		const lineGenerator = d3.line()
			.defined((d) => Number.isFinite(Number(d.y)) && getX(d) != null)
			.x(getX)
			.y(getY)

		const linesGroup = this.chartGroup
			.append("g")
			.attr("class", "lines");

		linesGroup
			.selectAll("path.line-path")
			.data(series)
			.enter()
			.append("path")
			.attr("class", "line-path")
			.attr("data-series-key", (serie) => String(serie.key))
			.attr("data-base-stroke-width", (serie) => this._getMarkSize(this._getSeriesDatum(serie), MARK_TYPES.LINES))
			.attr("fill", "none")
			.attr("stroke", (serie) => this._getMarkColor(this._getSeriesDatum(serie), MARK_TYPES.LINES))
			.attr("stroke-width", (serie) => this._getMarkSize(this._getSeriesDatum(serie), MARK_TYPES.LINES))
			.attr("stroke-linejoin", "round")
			.attr("stroke-linecap", "round")
			.attr("d", (serie) => lineGenerator(serie.rows || []))
			
	}

	_renderPoints( { layout, points = []}) {
		const { x, y } = layout

		const getX = (d) => {
			const value =  isQuantitativeScaleType(x?.scaleType) ? Number(d.x) : String(d.x)
			return x.scale(value)
		} 

		const getY = (d) => y.scale(Number(d.y))

		const pointsGroup = this.chartGroup.append('g').classed('points', true)

		pointsGroup.selectAll('circle')
			.data(points)
			.enter()
			.append('circle')
				.classed("line-points", true)
				.attr('data-series-key', d => String(d.seriesKey))	
				.attr('cx', getX)
				.attr('cy', getY)
				.attr('r', d => this._getMarkSize(d.datum, MARK_TYPES.POINTS))
				.attr('fill', d => this._getMarkColor(d.datum, MARK_TYPES.POINTS))
				.attr('stroke', d => this._getMarkStroke(d.datum, MARK_TYPES.POINTS))
				.attr('stroke-width', d => this._getMarkStrokeWidth(d.datum, MARK_TYPES.POINTS))
	}
	

	_setInteractions() {
		const lines = this.chartGroup.selectAll("path.line-path")

		lines.on("mouseover", (event, serie) => {
			this._focusMark({ seriesKey: String(serie.key) });
	
			this.callbacks.onHover?.({
				mark: MARK_TYPES.LINES,
				datum: this._resolveHoveredDatum(serie.rows || [], event),
				seriesKey: String(serie.key),
				x: event.offsetX,
				y: event.offsetY,
				event
			});
		})
		.on("mousemove", (event, serie) => {
			this.callbacks.onHover?.({
				mark: MARK_TYPES.LINES,
				datum: this._resolveHoveredDatum(serie.rows || [], event),
				seriesKey: String(serie.key),
				x: event.offsetX,
				y: event.offsetY,
				event
			});
		})
		.on("mouseout", (event, serie) => {
			this._resetFocusMark()
			this.callbacks.onOut?.()
		});


		const points = this.chartGroup.selectAll(".line-points");
		
		points.on("mouseover", (event, point) => {
			const seriesKey = String(point.seriesKey);

			this._focusMark({
				seriesKey,
				activeElement: event.currentTarget
			});

			this.callbacks.onHover?.({
				mark: MARK_TYPES.POINTS,
				datum: point.datum,
				seriesKey,
				x: event.offsetX,
				y: event.offsetY,
				event
			});
		})
		.on("mousemove", (event, point) => {
			this.callbacks.onHover?.({
				mark: MARK_TYPES.POINTS,
				datum: point.datum,
				seriesKey: String(point.seriesKey),
				x: event.offsetX,
				y: event.offsetY,
				event
			});
		})
		.on("mouseout", (event, point) => {
			this._resetFocusMark();

			this.callbacks.onOut?.();
		});
	}

	_resolveHoveredDatum(rows = [], event) {
		if (!Array.isArray(rows) || rows.length === 0) return null;

		const layout = this.visualArtifacts?.layout;
		const x = layout?.x;
		const plotNode = this.chartGroup?.node?.();

		if (!plotNode || !x?.scale) {
			return rows[0]?.datum || null;
		}

		const [mouseX] = d3.pointer(event, plotNode);

		const isContinuousX = [
			"linear",
			"log",
			"sqrt",
			"pow",
			"count",
			"quantitative",
			"sequential"
		].includes(String(x?.scaleType || "").toLowerCase());

		const projected = rows
			.map((d) => {
			const xValue = isContinuousX ? Number(d.x) : String(d.x);
			return {
				row: d,
				px: x.scale(xValue)
			};
			})
			.filter((d) => Number.isFinite(d.px));

		if (!projected.length) {
			return rows[0]?.datum || null;
		}

		const closest = projected.reduce((best, current) => {
			if (!best) return current;
			return Math.abs(current.px - mouseX) < Math.abs(best.px - mouseX)
			? current
			: best;
		}, null);

		return closest?.row?.datum || rows[0]?.datum || null;
	}

	_getSeriesDatum(serie) {
  		return serie?.rows?.find((d) => d?.datum)?.datum || {};
	}

	
	_focusMark({ seriesKey, activeElement = null } = {}) {
		const _this = this;

		this.chartGroup
			.selectAll(".line-path")
			.attr("opacity", function applyLineOpacity() {
				return this.getAttribute("data-series-key") === seriesKey ? 1 : 0.15;
			})
		
		this.chartGroup
			.selectAll(".line-points")
			.attr("opacity", function applyPointOpacity() {
				const sameSeries = this.getAttribute("data-series-key") === seriesKey;
				if (!sameSeries) return 0.15;
				if (!activeElement) return 1;
				return this === activeElement ? 1 : 0.45;
			})
			.attr("stroke", function applyPointStroke(d) {
				return this === activeElement ? "#ffffff" : this._getMarkStroke(d.datum, MARK_TYPES.POINTS);
			})
	}
	
	_resetFocusMark() {		
		this.chartGroup
			.selectAll(".line-path")
			.attr("opacity", 1)
		
		this.chartGroup
			.selectAll(".line-points")
			.attr("opacity", 1)
			.attr("stroke", d => this._getMarkStroke(d.datum, MARK_TYPES.POINTS))
	}
}
