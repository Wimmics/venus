import * as d3 from "d3";
import CartesianChartRenderer from "./cartesian-chart-renderer.js";
import { MARK_TYPES } from "@wimmics/venus-core";

export default class ScatterPlotRenderer extends CartesianChartRenderer {
	
	_renderVis() {
		const layout = this.visualArtifacts?.layout;
		const chart = this._state?.payload?.chart || this.chart;
		
		if (!layout?.x?.scale || !layout?.y?.scale || !chart) {
			return false;
		}
		
		this._retrieveMarkChannels({marks: [ MARK_TYPES.POINTS ]})
		
		this._renderAxes({ layout }) // implemented in parent class

		this._renderPoints({ layout, points: chart?.points })
		this._renderHoverGuides()

		this._setInteractions()
	}

	_renderPoints( { layout, points = []}) {
		const { x, y } = layout

		const pointsGroup = this.chartGroup.append('g').classed('points', true)

		pointsGroup.selectAll('circle')
			.data(points)
			.enter()
			.append('circle')	
				.classed("scatter-points", true)
				.attr("cx", d => x.scale(d.x))
				.attr("cy", d => y.scale(d.y))
				.attr("r", d => this._getMarkSize(d.datum, MARK_TYPES.POINTS))
				.attr('fill', d => this._getMarkColor(d.datum, MARK_TYPES.POINTS))
				.attr('stroke',  d => this._getMarkStroke(d.datum, MARK_TYPES.POINTS))
				.attr('stroke-width', d => this._getMarkStrokeWidth(d.datum, MARK_TYPES.POINTS))
	}

	_renderHoverGuides() {
		this.hoverGuides = this.chartGroup
			.append("g", ".scatter-points")
			.attr("class", "scatter-hover-guides")
			.style("pointer-events", "none")
			.style("display", "none")
		
		this.hoverGuides
			.selectAll("line")
			.data(["x-guide", "y-guide"])
			.enter()
			.append("line")
			.attr("stroke", "#777")
			.attr("stroke-width", 1.25)
			.attr("stroke-dasharray", "4,3");
	}

	

	_setInteractions() {
		const points = this.chartGroup.selectAll('.scatter-points')

		points.on("mouseover", (event, d) => {
			this._focusMark({ activeDatum: d, activeElement: event.currentTarget });
			
			this.callbacks.onHover?.({
				mark: MARK_TYPES.POINTS,
				datum: d.datum,
				x: event.offsetX,
				y: event.offsetY,
				event
			});
		})
		.on("mouseout", () => {
			this._resetFocusMark();

			this.callbacks.onOut?.();
		});
	}
	
	_focusMark({ activeDatum, activeElement } = {}) {
		
		this.chartGroup
			.selectAll(".scatter-points")
			.attr("opacity", (item) => (item === activeDatum ? 1 : 0.2))
			.attr("stroke", (item) => (item === activeDatum ? "#222222" : "#ffffff"))
			.attr("stroke-width", (item) => (item === activeDatum ? 2.25 : 1.25));
		
		this._showHoverGuides(activeElement)
	}
	
	_resetFocusMark() {
		
		this.chartGroup
			.selectAll(".scatter-points")
			.attr("opacity", 1)
			.attr("stroke", d => this._getMarkStroke(d.datum, MARK_TYPES.POINTS))
			.attr("stroke-width", d => this._getMarkStrokeWidth(d.datum, MARK_TYPES.POINTS))
		
		this._hideHoverGuides()
	}

	_showHoverGuides(activeElement) {
		const innerHeight = this.visualArtifacts?.layout?.innerHeight || 0;

		const point = d3.select(activeElement);
		const cx = Number(point.attr("cx"));
		const cy = Number(point.attr("cy"));

		if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;

		this.hoverGuides
			.style("display", null)
			.selectAll("line")
			.data([
			{ x1: 0, y1: cy, x2: cx, y2: cy },
			{ x1: cx, y1: cy, x2: cx, y2: innerHeight }
			])
			.attr("x1", d => d.x1)
			.attr("y1", d => d.y1)
			.attr("x2", d => d.x2)
			.attr("y2", d => d.y2);
	}

	_hideHoverGuides() {
		this.hoverGuides?.style("display", "none");
	}
}
