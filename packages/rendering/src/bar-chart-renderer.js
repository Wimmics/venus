import * as d3 from "d3";
import CartesianChartRenderer from "./cartesian-chart-renderer.js";
import { CHANNEL_TYPES, MARK_TYPES } from "@wimmics/venus-core";

export default class BarChartRenderer extends CartesianChartRenderer {

	_renderVis() {
		const layout = this.visualArtifacts?.layout;
		const chart = this._state?.payload?.chart || this.chart;

		this.barPadding = 3 // space between axis and first bar
		
		if (!layout?.x?.scale || !layout?.y?.scale || !chart) {
			return false;
		}
		
		this._retrieveMarkChannels({marks: [ MARK_TYPES.BARS ]})
		this._retrieveMarkAttributes({marks: [ MARK_TYPES.BARS ]})
		
		this._renderAxes({ layout }) // implemented in parent class
		
		if (layout.isHorizontal) this._renderHorizontalBars({ layout, bars: chart.bars });
		else this._renderVerticalBars({ layout, bars: chart.bars });
		
		this._setInteractions();
		
		return true;
	}
	
	_renderVerticalBars({ layout, bars = [] }){
		const { x, y, group, innerHeight, mode } = layout

		const visibleBars = bars.filter(d => d.observed !== false)

		const isGrouped = mode === "grouped";
		const isStacked = mode === "stacked" || mode === "normalize";

		const getX = (d) => {
			const baseX = x.scale(d.x) ?? 0;
			if (isGrouped) return baseX + (group?.scale?.(d.sub) || 0);
			return baseX;
		};

		const getY = (d) => {
			if (isStacked) return y.scale(d.y1);
			return y.scale(d.value);
		};

		const getWidth = () => {
			if (isGrouped) return group?.scale?.bandwidth?.() || x.scale.bandwidth();
			return x.scale.bandwidth();
		};

		const getHeight = (d) => {
			if (isStacked) {
				const rawHeight = y.scale(d.y0) - y.scale(d.y1);
				const touchesBaseline = d.y0 === 0;
				return Math.max(0, rawHeight - (touchesBaseline ? this.barPadding : 0));
			}

			return Math.max(0, innerHeight - y.scale(d.value) - this.barPadding);
		};

		this.chartGroup
			.append("g")
			.attr("class", "bars")
			.selectAll("rect")
			.data(visibleBars)
			.enter()
			.append("rect")
			.attr("x", getX)
			.attr("y", getY)
			.attr("width", getWidth)
			.attr("height", getHeight)
			.attr("fill", (d) => this._getMarkColor(d.datum, MARK_TYPES.BARS) )
			.attr("stroke", "#ffffff")
			.attr("stroke-width", (d) => this._getMarkStrokeWidth(d.datum, MARK_TYPES.BARS));

		this._renderBarLabels({
			bars: visibleBars,
			getX,
			getY,
			getWidth,
			getHeight,
			orientation: "vertical"
		});

	}

	_renderHorizontalBars({ layout, bars }) {
		const { x, y, group, mode } = layout

		const visibleBars = bars.filter(d => d.observed !== false)

		const isGrouped = mode === "grouped";
		const isStacked = mode === "stacked" || mode === "normalize";

		
		const getX = (d) => {
			if (isStacked) return x.scale(d.y0);
			return 0;
		};

		const getY = (d) => {
			const baseY = y.scale(d.x);
			if (baseY == null) return 0;

			if (isGrouped) {
			return baseY + (group?.scale?.(d.sub) || 0);
			}

			return baseY;
		};

		const getWidth = (d) => {
			if (isStacked) {
			return Math.max(0, x.scale(d.y1) - x.scale(d.y0));
			}

			return Math.max(0, x.scale(d.value));
		};

		const getHeight = () => {
			if (isGrouped) {
				return group?.scale?.bandwidth?.() || y.scale.bandwidth();
			}

			return y.scale.bandwidth();
		};

		this.chartGroup
			.append("g")
			.attr("class", "bars")
			.selectAll("rect")
			.data(visibleBars)
			.enter()
			.append("rect")
			.attr("x", d => this.barPadding + getX(d))
			.attr("y", getY)
			.attr("width", getWidth)
			.attr("height", getHeight)
			.attr("fill", (d) => this._getMarkColor(d.datum, MARK_TYPES.BARS))
			.attr("stroke", "#ffffff")
			.attr("stroke-width", (d) => this._getMarkStrokeWidth(d.datum, MARK_TYPES.BARS));

		this._renderBarLabels({
			bars: visibleBars,
			getX: (d) => this.barPadding + getX(d),
			getY,
			getWidth,
			getHeight,
			orientation: "horizontal"
		});
	}

	_renderBarLabels({ bars = [], getX, getY, getWidth, getHeight, orientation = "vertical" }) {
		const labelData = bars.filter((d) => this._displayLabel(d?.datum, MARK_TYPES.BARS) && this._getLabelText(d));
		if (!labelData.length) return;

		this.chartGroup
			.append("g")
			.attr("class", "bar-labels")
			.selectAll("text")
			.data(labelData)
			.enter()
			.append("text")
			.attr("class", "bar-label")
			.attr("x", (d) => Number(getX(d)) + Number(getWidth(d)) / 2)
			.attr("y", (d) => {
				const y = Number(getY(d));
				const h = Number(getHeight(d));

				if (orientation === "horizontal") {
					return y + h / 2;
				}

				return h >= 18 ? y + 14 : y - 4;
			})
			.attr("dy", orientation === "horizontal" ? "0.35em" : null)
			.attr("text-anchor", "middle")
			.style("pointer-events", "none")
			.style("font-size", "11px")
			.style("fill", "#333")
			.text((d) => this._getLabelText(d));
	}

	_setInteractions() {
		const bars = this.chartGroup.selectAll(".bars rect");
		if (!bars.size()) return;
		
		bars
		.attr("data-base-stroke-width", function () {
			const current = Number(d3.select(this).attr("stroke-width"));
			return Number.isFinite(current) && current >= 0 ? current : 0;
		})
		.on("mouseover", (event, datum) => {
			this._focusMark({ activeElement: event.currentTarget });
			
			const rawDatum = datum?.datum || datum?.raw || datum;
			
			this.callbacks.onHover?.({
				mark: MARK_TYPES.BARS,
				datum: rawDatum,
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

	_focusMark({ activeElement } = {}) {
		if (!activeElement) return;
		
		this.chartGroup.selectAll(".bars rect")
			.attr("opacity", function () {
				return this === activeElement ? 1 : 0.2;
			})
			.attr("stroke", function () {
				return this === activeElement ? "#222222" : "#ffffff";
			})
			.attr("stroke-width", function () {
				const base = Number(this.getAttribute("data-base-stroke-width"));
				const safeBase = Number.isFinite(base) && base >= 0 ? base : 0;
				return this === activeElement ? Math.max(1.5, safeBase + 1) : safeBase;
			});
	}

	_resetFocusMark() {
		
		this.chartGroup.selectAll(".bars rect")
			.attr("opacity", 1)
			.attr("stroke", "#ffffff")
			.attr("stroke-width", function () {
				const base = Number(this.getAttribute("data-base-stroke-width"));
				return Number.isFinite(base) && base >= 0 ? base : 0;
			});
	}
}