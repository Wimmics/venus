import * as d3 from "d3";
import CartesianChartRenderer from "./cartesian-chart-renderer.js";
import { CHANNEL_TYPES, MARK_TYPES } from "@wimmics/venus-core";

export default class BarChartRenderer extends CartesianChartRenderer {
	_renderVis() {
		const plot = this._state?.plot;
		const layout = this.visualArtifacts?.layout;
		const chart = this._state?.payload?.chart || this._state?.chart || this.chart;

		console.log("[BarChart] artifacts = ", this.visualArtifacts)
		
		if (!plot || !layout?.x?.scale || !layout?.y?.scale || !chart) {
			return false;
		}
		
		this._retrieveMarkChannels({marks: [ MARK_TYPES.BARS ]})
		
		this._renderAxes({ plot, layout });
		
		if (layout.direction === "horizontal") {
			this._renderHorizontalBars({ plot, layout, bars: chart.bars });
		} else {
			this._renderVerticalBars({ plot, layout, bars: chart.bars });
		}
		
		this._applyBarInteractions(plot);
		
		return true;
	}
	
	_renderAxes({ plot, layout }) {
		const { x, y, innerWidth, innerHeight } = layout;
		
		const {
			mapping,
			xAxisConfig,
			yAxisConfig,
			xLabelAngle,
			xLabelOffset,
			yLabelOffset
		} = this._state || {};
		
		const yTickFormatter = this._buildTickFormatter(
			yAxisConfig?.tickFormat || (layout.stack?.normalized ? "percent" : "raw")
		);
		
		if (layout.direction === "horizontal") {
			plot
			.append("g")
			.attr("class", "x-axis")
			.attr("transform", `translate(0,${innerHeight})`)
			.call(this._buildValueAxis("bottom", x.scale, yTickFormatter, yAxisConfig, x.scaleType));
			
			plot
			.append("g")
			.attr("class", "y-axis")
			.call(d3.axisLeft(y.scale));
			
			this._renderAxisTitles({
				plot,
				innerWidth,
				innerHeight,
				bottomTitle: this._resolveAxisTitle(mapping?.y?.axis, y.field),
				leftTitle: this._resolveAxisTitle(mapping?.x?.axis, x.field)
			});
			
			return;
		}
		
		plot
		.append("g")
		.attr("class", "x-axis")
		.attr("transform", `translate(0,${innerHeight})`)
		.call(d3.axisBottom(x.scale))
		.selectAll("text")
		.style("text-anchor", xLabelAngle ? "end" : "middle")
		.attr(
			"transform",
			xLabelAngle
			? `translate(${xLabelOffset.x},${xLabelOffset.y}) rotate(${xLabelAngle})`
			: `translate(${xLabelOffset.x},${xLabelOffset.y})`
		);
		
		plot
		.append("g")
		.attr("class", "y-axis")
		.call(this._buildValueAxis("left", y.scale, yTickFormatter, yAxisConfig, y.scaleType))
		.selectAll("text")
		.attr("transform", `translate(${yLabelOffset.x},${yLabelOffset.y})`);
		
		this._renderAxisTitles({
			plot,
			innerWidth,
			innerHeight,
			bottomTitle: this._resolveAxisTitle(mapping?.x?.axis, x.field),
			leftTitle: this._resolveAxisTitle(mapping?.y?.axis, y.field)
		});
	}
	

	_renderVerticalBars({ plot, layout, bars = [] }){
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
				return Math.max(0, y.scale(d.y0) - y.scale(d.y1));
			}

			return Math.max(0, innerHeight - y.scale(d.value));
		};

		plot
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

	}

	_renderHorizontalBars({ plot, layout, bars }) {
		const { x, y, group, innerHeight, mode } = layout

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

		plot
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
			.attr("fill", (d) => this._getMarkColor(d.datum, MARK_TYPES.BARS))
			.attr("stroke", "#ffffff")
			.attr("stroke-width", (d) => this._getMarkStrokeWidth(d.datum, MARK_TYPES.BARS));
	}

	_renderHorizontalSimpleBars({ plot, layout, bars }) {
		const { x, y } = layout;
		
		const barGroup = plot
			.append("g")
			.attr("class", "bars")
		
		barGroup.selectAll("rect")
			.data(bars || [])
			.enter()
			.append("rect")
			.attr("x", 0)
			.attr("y", (d) => y.scale(d.x))
			.attr("width", (d) => Math.max(0, x.scale(d.value)))
			.attr("height", y.scale.bandwidth())
			.attr("fill", (d) => this._getMarkColor(d.datum, MARK_TYPES.BARS))
			.attr("stroke", "#ffffff")
			.attr("stroke-width", (d) => this._getMarkStrokeWidth(d.datum, MARK_TYPES.BARS));
	}

	_renderHorizontalGroupedBars({ plot, layout, bars }) {
		const { x, y, group } = layout;
		const observed = (bars || []).filter((d) => d.observed !== false);
		
		const barGroup = plot
			.append("g")
			.attr("class", "bars")
		
		barGroup.selectAll("rect")
			.data(observed)
			.enter()
			.append("rect")
			.attr("x", 0)
			.attr("y", (d) => y.scale(d.x) + (group?.scale?.(d.sub) || 0))
			.attr("width", (d) => Math.max(0, x.scale(d.value)))
			.attr("height", group?.scale?.bandwidth?.() || y.scale.bandwidth())
			.attr("fill", (d) => this._getMarkColor(d.datum, MARK_TYPES.BARS))
			.attr("stroke", "#ffffff")
			.attr("stroke-width", (d) => this._getMarkStrokeWidth(d.datum, MARK_TYPES.BARS));
	}

	_renderHorizontalStackedBars({ plot, layout, bars }) {
		const { x, y } = layout;

		plot
			.append("g")
			.attr("class", "bars")
			.selectAll("rect")
			.data((bars || []).filter((d) => d.observed !== false))
			.enter()
			.append("rect")
			.attr("x", (d) => x.scale(d.y0))
			.attr("y", (d) => y.scale(d.x))
			.attr("width", (d) => Math.max(0, x.scale(d.y1) - x.scale(d.y0)))
			.attr("height", y.scale.bandwidth())
			.attr("fill", (d) => this._getMarkColor(d.datum, MARK_TYPES.BARS))
			.attr("stroke", "#ffffff")
			.attr("stroke-width", (d) => this._getMarkStrokeWidth(d.datum, MARK_TYPES.BARS));
	}

	_applyBarInteractions(plot) {
		const bars = plot.selectAll(".bars rect");
		if (!bars.size()) return;
		
		bars
		.attr("data-base-stroke-width", function () {
			const current = Number(d3.select(this).attr("stroke-width"));
			return Number.isFinite(current) && current >= 0 ? current : 0;
		})
		.on("mouseover", (event, datum) => {
			this._focusMark({ mark: "bar", activeElement: event.currentTarget });
			
			const rawDatum = datum?.datum || datum?.raw || datum;
			
			this.callbacks.onHover?.({
				mark: "bar",
				datum: rawDatum,
				x: event.offsetX,
				y: event.offsetY,
				event
			});
		})
		.on("mouseout", () => {
			this._resetFocusMark({ mark: "bar" });
			this.callbacks.onOut?.({ mark: "bar" });
		});
	}

	_focusMark({ mark, activeElement } = {}) {
		if (mark !== "bar" || !activeElement) return;
		
		const plot = this._state?.plot;
		if (!plot) return;
		
		plot.selectAll(".bars rect")
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

	_resetFocusMark({ mark } = {}) {
		if (mark && mark !== "bar") return;
		
		const plot = this._state?.plot;
		if (!plot) return;
		
		plot
		.selectAll(".bars rect")
		.attr("opacity", 1)
		.attr("stroke", "#ffffff")
		.attr("stroke-width", function () {
			const base = Number(this.getAttribute("data-base-stroke-width"));
			return Number.isFinite(base) && base >= 0 ? base : 0;
		});
	}
}