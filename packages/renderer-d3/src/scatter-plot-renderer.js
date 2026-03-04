import * as d3 from "d3";
import CartesianChartRenderer from "./cartesian-chart-renderer.js";

export default class ScatterPlotRenderer extends CartesianChartRenderer {
  _getMarginBase() {
    return { top: 24, right: 36, bottom: 64, left: 64 };
  }

  _renderVis() {
    const {
      mapping,
      xAxisConfig,
      yAxisConfig,
      xLabelAngle,
      xLabelOffset,
      yLabelOffset,
      innerWidth,
      innerHeight,
      xField,
      yField,
      plot,
      visualArtifacts,
      width,
      height
    } = this._state || {};

    const hasPointsConfig =
      mapping && typeof mapping === "object" && Object.prototype.hasOwnProperty.call(mapping, "points");
    const pointsConfig = mapping?.points || {};
    const pointsEnabled = pointsConfig.display === undefined ? hasPointsConfig : pointsConfig.display === true;
    if (!pointsEnabled) return true;

    const xScaleConfig = mapping?.x?.scale || {};
    const yScaleConfig = mapping?.y?.scale || {};

    const artifactChannels = Array.isArray(visualArtifacts?.channels) ? visualArtifacts.channels : [];
    const artifactScales = visualArtifacts?.scales instanceof Map ? visualArtifacts.scales : new Map();
    const pointColorChannel =
      artifactChannels.find((item) => item?.mark === "points" && item?.channel === "color") || null;
    const pointSizeChannel =
      artifactChannels.find((item) => item?.mark === "points" && item?.channel === "size") || null;

    const pointColorScale =
      pointColorChannel?.scaleId ? artifactScales.get(pointColorChannel.scaleId) || null : null;
    const pointSizeScale =
      pointSizeChannel?.scaleId ? artifactScales.get(pointSizeChannel.scaleId) || null : null;

    const pointColorField = pointsConfig?.color?.field;
    const pointSizeField = pointsConfig?.size?.field;
    const defaultPointColor = pointColorChannel?.defaultValue || pointsConfig?.color?.value || "#4e79a7";
    const defaultPointSize = pointSizeChannel?.defaultValue || pointsConfig?.size?.value || 4;

    const rows = this.data
      .map((row) => ({
        row,
        xRaw: row?.[xField],
        yRaw: row?.[yField],
        xNum: Number(row?.[xField]),
        yNum: Number(row?.[yField])
      }))
      .filter((item) => item.xRaw !== undefined && item.xRaw !== null && item.yRaw !== undefined && item.yRaw !== null);

    if (!rows.length) {
      this._renderCenteredMessage(width, height, "No plottable rows found for the selected x/y fields");
      this._resetFitState();
      return false;
    }

    const xScaleType = String(xScaleConfig.type || "linear").toLowerCase();
    const yScaleType = String(yScaleConfig.type || "linear").toLowerCase();
    const xWantsNumeric = ["linear", "log", "sqrt", "pow", "count"].includes(xScaleType);
    const yWantsNumeric = ["linear", "log", "sqrt", "pow", "count"].includes(yScaleType);
    const xNumericOk = rows.every((item) => Number.isFinite(item.xNum));
    const yNumericOk = rows.every((item) => Number.isFinite(item.yNum));
    const useContinuousX = xWantsNumeric && xNumericOk;
    const useContinuousY = yWantsNumeric && yNumericOk;

    const xValues = useContinuousX ? rows.map((item) => item.xNum) : rows.map((item) => String(item.xRaw));
    const yValues = useContinuousY ? rows.map((item) => item.yNum) : rows.map((item) => String(item.yRaw));

    let xScale;
    if (useContinuousX) {
      const domainFromEncoding = xScaleConfig.domain;
      const computed = d3.extent(xValues);
      const domain = Array.isArray(domainFromEncoding) && domainFromEncoding.length >= 2
        ? [Number(domainFromEncoding[0]), Number(domainFromEncoding[domainFromEncoding.length - 1])]
        : [computed[0], computed[1]];
      xScale = d3.scaleLinear().domain(domain).range([0, innerWidth]).nice();
    } else {
      xScale = d3.scalePoint().domain(Array.from(new Set(xValues))).range([0, innerWidth]).padding(0.2);
    }

    const createYScale = (domain, scaleTypeName) => {
      if (scaleTypeName === "sqrt") return d3.scaleSqrt().domain(domain).range([innerHeight, 0]).nice();
      if (scaleTypeName === "log") {
        const safeMin = Math.max(1e-9, domain[0]);
        const safeMax = Math.max(safeMin * 10, domain[1]);
        return d3.scaleLog().domain([safeMin, safeMax]).range([innerHeight, 0]).nice();
      }
      if (scaleTypeName === "pow") {
        const exponent = Number.isFinite(yScaleConfig.exponent) ? Number(yScaleConfig.exponent) : 1;
        return d3.scalePow().exponent(exponent).domain(domain).range([innerHeight, 0]).nice();
      }
      return d3.scaleLinear().domain(domain).range([innerHeight, 0]).nice();
    };

    let yScale;
    if (useContinuousY) {
      const domainFromEncoding = yScaleConfig.domain;
      const computed = d3.extent(yValues);
      let domain = Array.isArray(domainFromEncoding) && domainFromEncoding.length >= 2
        ? [Number(domainFromEncoding[0]), Number(domainFromEncoding[domainFromEncoding.length - 1])]
        : [computed[0], computed[1]];
      if (domain[0] === domain[1]) domain = [domain[0] - 1, domain[1] + 1];
      yScale = createYScale(domain, yScaleType);
    } else {
      yScale = d3.scalePoint().domain(Array.from(new Set(yValues))).range([innerHeight, 0]).padding(0.2);
    }

    const xTickFormatter = useContinuousX
      ? this._buildTickFormatter(
          xAxisConfig.tickFormat || (xScaleType === "count" ? "integer" : "raw"),
          { fallback: "number" }
        )
      : this._buildTickFormatter(xAxisConfig.tickFormat, { fallback: "string" });

    const yTickFormatter = useContinuousY
      ? this._buildTickFormatter(
          yAxisConfig.tickFormat || (yScaleType === "count" ? "integer" : "raw"),
          { fallback: "number" }
        )
      : this._buildTickFormatter(yAxisConfig.tickFormat, { fallback: "string" });

    plot
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(this._buildValueAxis("bottom", xScale, xTickFormatter, xAxisConfig, xScaleType))
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
      .call(this._buildValueAxis("left", yScale, yTickFormatter, yAxisConfig, yScaleType))
      .selectAll("text")
      .attr("transform", `translate(${yLabelOffset.x},${yLabelOffset.y})`);

    this._renderAxisTitles({
      plot,
      innerWidth,
      innerHeight,
      bottomTitle: this._resolveAxisTitle(mapping?.x?.axis, xField),
      leftTitle: this._resolveAxisTitle(mapping?.y?.axis, yField)
    });

    const resolvePointColor = (row) => {
      if (!pointColorField) return defaultPointColor;
      if (!pointColorScale) return defaultPointColor;
      const raw = row?.[pointColorField];
      if (raw === undefined || raw === null) return defaultPointColor;
      const scaled = pointColorScale(raw);
      return scaled || defaultPointColor;
    };

    const resolvePointRadius = (row) => {
      if (!pointSizeField) {
        const fixed = Number(defaultPointSize);
        return Number.isFinite(fixed) && fixed > 0 ? fixed : 4;
      }
      if (!pointSizeScale) {
        const fixed = Number(defaultPointSize);
        return Number.isFinite(fixed) && fixed > 0 ? fixed : 4;
      }
      const raw = Number(row?.[pointSizeField]);
      if (!Number.isFinite(raw)) {
        const fixed = Number(defaultPointSize);
        return Number.isFinite(fixed) && fixed > 0 ? fixed : 4;
      }
      const scaled = Number(pointSizeScale(raw));
      if (Number.isFinite(scaled) && scaled > 0) return scaled;
      const fixed = Number(defaultPointSize);
      return Number.isFinite(fixed) && fixed > 0 ? fixed : 4;
    };

    plot
      .append("g")
      .attr("class", "scatter-points")
      .selectAll("circle")
      .data(rows)
      .enter()
      .append("circle")
      .attr("cx", (item) => (useContinuousX ? xScale(item.xNum) : xScale(String(item.xRaw))))
      .attr("cy", (item) => (useContinuousY ? yScale(item.yNum) : yScale(String(item.yRaw))))
      .attr("r", (item) => resolvePointRadius(item.row))
      .attr("fill", (item) => resolvePointColor(item.row))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.25)
      .on("mouseover", (event, item) => {
        this._focusMark({ mark: "point", activeDatum: item, activeElement: event.currentTarget });
        this.callbacks.onHover?.({
          mark: "point",
          datum: item.row,
          x: event.offsetX,
          y: event.offsetY,
          event
        });
      })
      .on("mouseout", () => {
        this._resetFocusMark({ mark: "point" });
        this.callbacks.onOut?.({ mark: "point" });
      });

    return true;
  }

  _focusMark({ mark, activeDatum, activeElement } = {}) {
    if (mark !== "point") return;
    const plot = this._state?.plot;
    if (!plot) return;
    plot
      .selectAll(".scatter-points circle")
      .attr("opacity", (item) => (item === activeDatum ? 1 : 0.2))
      .attr("stroke", (item) => (item === activeDatum ? "#222222" : "#ffffff"))
      .attr("stroke-width", (item) => (item === activeDatum ? 2.25 : 1.25));

    const innerHeight = Number(this._state?.innerHeight) || 0;
    const selected = activeElement ? d3.select(activeElement) : null;
    const cx = selected ? Number(selected.attr("cx")) : NaN;
    const cy = selected ? Number(selected.attr("cy")) : NaN;
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;

    let guides = plot.select(".scatter-hover-guides");
    if (guides.empty()) {
      guides = plot
        .insert("g", ".scatter-points")
        .attr("class", "scatter-hover-guides")
        .style("pointer-events", "none");
    }

    guides
      .selectAll("line")
      .data([
        { x1: 0, y1: cy, x2: cx, y2: cy },
        { x1: cx, y1: cy, x2: cx, y2: innerHeight }
      ])
      .join("line")
      .attr("x1", (d) => d.x1)
      .attr("y1", (d) => d.y1)
      .attr("x2", (d) => d.x2)
      .attr("y2", (d) => d.y2)
      .attr("stroke", "#777777")
      .attr("stroke-width", 1.25)
      .attr("stroke-dasharray", "4,3")
      .attr("opacity", 0.9);
  }

  _resetFocusMark({ mark } = {}) {
    if (mark && mark !== "point") return;
    const plot = this._state?.plot;
    if (!plot) return;
    plot
      .selectAll(".scatter-points circle")
      .attr("opacity", 1)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.25);

    plot.selectAll(".scatter-hover-guides").remove();
  }
}
