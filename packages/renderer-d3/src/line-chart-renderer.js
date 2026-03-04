import * as d3 from "d3";
import CartesianChartRenderer from "./cartesian-chart-renderer.js";

export default class LineChartRenderer extends CartesianChartRenderer {
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
    const linesConfig = mapping?.lines || {};
    const lineColorConfig = linesConfig?.color || {};
    const lineSizeConfig = linesConfig?.size || {};
    const colorField = lineColorConfig?.field;
    const sizeField = lineSizeConfig?.field;
    const hasPointsConfig =
      mapping && typeof mapping === "object" && Object.prototype.hasOwnProperty.call(mapping, "points");
    const pointsConfig = mapping?.points || {};
    const pointsEnabled = pointsConfig.display === undefined ? hasPointsConfig : pointsConfig.display === true;
    const xScaleConfig = mapping?.x?.scale || {};
    const yScaleConfig = mapping?.y?.scale || {};

    const artifactChannels = Array.isArray(visualArtifacts?.channels) ? visualArtifacts.channels : [];
    const artifactScales = visualArtifacts?.scales instanceof Map ? visualArtifacts.scales : new Map();
    const lineColorChannel =
      artifactChannels.find((item) => item?.mark === "lines" && item?.channel === "color") || null;
    const lineSizeChannel =
      artifactChannels.find((item) => item?.mark === "lines" && item?.channel === "size") || null;
    const pointColorChannel =
      artifactChannels.find((item) => item?.mark === "points" && item?.channel === "color") || null;
    const pointSizeChannel =
      artifactChannels.find((item) => item?.mark === "points" && item?.channel === "size") || null;

    const colorScale = lineColorChannel?.scaleId ? artifactScales.get(lineColorChannel.scaleId) || null : null;
    const sizeScale = lineSizeChannel?.scaleId ? artifactScales.get(lineSizeChannel.scaleId) || null : null;
    const pointColorScale =
      pointColorChannel?.scaleId ? artifactScales.get(pointColorChannel.scaleId) || null : null;
    const pointSizeScale =
      pointSizeChannel?.scaleId ? artifactScales.get(pointSizeChannel.scaleId) || null : null;
    const defaultLineColor = lineColorChannel?.defaultValue || lineColorConfig?.value || "#4e79a7";
    const defaultLineSize = lineSizeChannel?.defaultValue || lineSizeConfig?.value || 2;
    const pointColorField = pointsConfig?.color?.field;
    const pointSizeField = pointsConfig?.size?.field;
    const defaultPointColor = pointColorChannel?.defaultValue || pointsConfig?.color?.value || defaultLineColor;
    const defaultPointSize = pointSizeChannel?.defaultValue || pointsConfig?.size?.value || 3;

    const rows = this.data
      .map((row, index) => ({
        row,
        xRaw: row?.[xField],
        yRaw: row?.[yField],
        y: Number(row?.[yField]),
        index
      }))
      .filter((item) => item.xRaw !== undefined && item.xRaw !== null && Number.isFinite(item.y));

    if (!rows.length) {
      this._renderCenteredMessage(width, height, "No plottable rows found for the selected x/y fields");
      this._resetFitState();
      return false;
    }

    const xScaleType = String(xScaleConfig.type || "ordinal").toLowerCase();
    const useNumericX = ["linear", "log", "sqrt", "pow", "count"].includes(xScaleType);
    const numericXOk = rows.every((item) => Number.isFinite(Number(item.xRaw)));
    const useContinuousX = useNumericX && numericXOk;

    const xValues = useContinuousX
      ? rows.map((item) => Number(item.xRaw))
      : rows.map((item) => String(item.xRaw));
    const yValues = rows.map((item) => item.y);

    let xScale;
    if (useContinuousX) {
      const xDomainFromEncoding = xScaleConfig.domain;
      const computedDomain = d3.extent(xValues);
      const domain = Array.isArray(xDomainFromEncoding) && xDomainFromEncoding.length >= 2
        ? [Number(xDomainFromEncoding[0]), Number(xDomainFromEncoding[xDomainFromEncoding.length - 1])]
        : [computedDomain[0], computedDomain[1]];
      xScale = d3.scaleLinear().domain(domain).range([0, innerWidth]);
    } else {
      const domain = Array.from(new Set(xValues));
      xScale = d3.scalePoint().domain(domain).range([0, innerWidth]).padding(0.2);
    }

    const yDomainFromEncoding = yScaleConfig.domain;
    const yComputed = d3.extent(yValues);
    let yDomain = Array.isArray(yDomainFromEncoding) && yDomainFromEncoding.length >= 2
      ? [Number(yDomainFromEncoding[0]), Number(yDomainFromEncoding[yDomainFromEncoding.length - 1])]
      : [yComputed[0], yComputed[1]];
    if (yDomain[0] === yDomain[1]) {
      yDomain = [yDomain[0] - 1, yDomain[1] + 1];
    }
    const yScaleType = String(yScaleConfig.type || "linear").toLowerCase();
    let yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]).nice();
    if (yScaleType === "sqrt") yScale = d3.scaleSqrt().domain(yDomain).range([innerHeight, 0]).nice();
    if (yScaleType === "log") {
      const safeMin = Math.max(1e-9, yDomain[0]);
      const safeMax = Math.max(safeMin * 10, yDomain[1]);
      yScale = d3.scaleLog().domain([safeMin, safeMax]).range([innerHeight, 0]).nice();
    }
    if (yScaleType === "pow") {
      const exponent = Number.isFinite(yScaleConfig.exponent) ? Number(yScaleConfig.exponent) : 1;
      yScale = d3.scalePow().exponent(exponent).domain(yDomain).range([innerHeight, 0]).nice();
    }

    const xTickFormatter = useContinuousX
      ? this._buildTickFormatter(
          xAxisConfig.tickFormat || (xScaleType === "count" ? "integer" : "raw"),
          { fallback: "number" }
        )
      : this._buildTickFormatter(xAxisConfig.tickFormat, { fallback: "string" });
    const yTickFormatter = this._buildTickFormatter(
      yAxisConfig.tickFormat || (yScaleType === "count" ? "integer" : "raw"),
      { fallback: "number" }
    );

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

    const groups = d3.group(rows, (item) => (
      colorField ? String(item.row?.[colorField] ?? "undefined") : "__single__"
    ));

    const toSeriesSizeValue = (seriesRows) => {
      if (!sizeField) return defaultLineSize;
      const values = seriesRows
        .map((item) => Number(item.row?.[sizeField]))
        .filter((value) => Number.isFinite(value));
      if (!values.length) return defaultLineSize;
      return d3.mean(values);
    };

    const toSeriesColor = (groupKey) => {
      if (!colorField || !colorScale) return defaultLineColor;
      const color = colorScale(groupKey);
      return color || defaultLineColor;
    };

    const toSeriesStrokeWidth = (seriesRows) => {
      const base = toSeriesSizeValue(seriesRows);
      if (!sizeField || !sizeScale) return Number(base) || defaultLineSize;
      const widthValue = sizeScale(base);
      const n = Number(widthValue);
      return Number.isFinite(n) ? n : defaultLineSize;
    };

    const resolvePointColor = (row, seriesStroke) => {
      if (!pointsEnabled) return seriesStroke;
      if (!pointColorField) return defaultPointColor || seriesStroke;
      if (!pointColorScale) return defaultPointColor || seriesStroke;
      const raw = row?.[pointColorField];
      if (raw === undefined || raw === null) return defaultPointColor || seriesStroke;
      const scaled = pointColorScale(raw);
      return scaled || defaultPointColor || seriesStroke;
    };

    const resolvePointRadius = (row, seriesStrokeWidth) => {
      if (!pointsEnabled) return Math.max(2, Math.min(6, seriesStrokeWidth + 0.5));
      if (!pointSizeField) {
        const fixed = Number(defaultPointSize);
        return Number.isFinite(fixed) && fixed > 0 ? fixed : 3;
      }
      if (!pointSizeScale) {
        const fixed = Number(defaultPointSize);
        return Number.isFinite(fixed) && fixed > 0 ? fixed : 3;
      }
      const raw = Number(row?.[pointSizeField]);
      if (!Number.isFinite(raw)) {
        const fixed = Number(defaultPointSize);
        return Number.isFinite(fixed) && fixed > 0 ? fixed : 3;
      }
      const scaled = Number(pointSizeScale(raw));
      if (Number.isFinite(scaled) && scaled > 0) return scaled;
      const fixed = Number(defaultPointSize);
      return Number.isFinite(fixed) && fixed > 0 ? fixed : 3;
    };

    const lineGenerator = d3.line()
      .defined((item) => Number.isFinite(item.y))
      .x((item) => useContinuousX ? xScale(Number(item.xRaw)) : xScale(String(item.xRaw)))
      .y((item) => yScale(item.y));

    for (const [groupKey, groupRows] of groups.entries()) {
      const sorted = [...groupRows].sort((a, b) => {
        if (useContinuousX) return Number(a.xRaw) - Number(b.xRaw);
        return a.index - b.index;
      });

      const stroke = toSeriesColor(groupKey);
      const strokeWidth = toSeriesStrokeWidth(sorted);

      plot
        .append("path")
        .datum(sorted)
        .attr("class", "line-path")
        .attr("data-series-key", String(groupKey))
        .attr("data-base-stroke-width", strokeWidth)
        .attr("fill", "none")
        .attr("stroke", stroke)
        .attr("stroke-width", strokeWidth)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", lineGenerator)
        .on("mouseover", () => {
          this._focusMark({ mark: "series", seriesKey: String(groupKey) });
        })
        .on("mouseout", () => {
          this._resetFocusMark({ mark: "series" });
        });

      if (pointsEnabled) {
        plot
          .append("g")
          .attr("class", "line-points")
          .selectAll("circle")
          .data(sorted)
          .enter()
          .append("circle")
          .attr("data-series-key", String(groupKey))
          .attr("cx", (item) => useContinuousX ? xScale(Number(item.xRaw)) : xScale(String(item.xRaw)))
          .attr("cy", (item) => yScale(item.y))
          .attr("r", (item) => resolvePointRadius(item.row, strokeWidth))
          .attr("fill", (item) => resolvePointColor(item.row, stroke))
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.25)
          .on("mouseover", (event, item) => {
            this._focusMark({
              mark: "point",
              seriesKey: String(groupKey),
              activeElement: event.currentTarget
            });
            this.callbacks.onHover?.({
              mark: "point",
              datum: item.row,
              seriesKey: String(groupKey),
              x: event.offsetX,
              y: event.offsetY,
              event
            });
          })
          .on("mouseout", () => {
            this._resetFocusMark({ mark: "point", seriesKey: String(groupKey) });
            this.callbacks.onOut?.({ mark: "point", seriesKey: String(groupKey) });
          });
      }
    }

    return true;
  }

  _focusMark({ mark, seriesKey, activeElement = null } = {}) {
    if (!seriesKey || (mark !== "series" && mark !== "point")) return;
    const plot = this._state?.plot;
    if (!plot) return;

    plot
      .selectAll(".line-path")
      .attr("opacity", function applyLineOpacity() {
        return this.getAttribute("data-series-key") === seriesKey ? 1 : 0.15;
      })
      .attr("stroke-width", function applyLineWidth() {
        const base = Number(this.getAttribute("data-base-stroke-width"));
        const safeBase = Number.isFinite(base) && base > 0 ? base : 2;
        return this.getAttribute("data-series-key") === seriesKey
          ? safeBase * 1.45
          : Math.max(1, safeBase * 0.75);
      });

    plot
      .selectAll(".line-points circle")
      .attr("opacity", function applyPointOpacity() {
        const sameSeries = this.getAttribute("data-series-key") === seriesKey;
        if (!sameSeries) return 0.15;
        if (!activeElement) return 1;
        return this === activeElement ? 1 : 0.45;
      })
      .attr("stroke", function applyPointStroke() {
        return this === activeElement ? "#222222" : "#ffffff";
      })
      .attr("stroke-width", function applyPointStrokeWidth() {
        return this === activeElement ? 2.25 : 1.25;
      });
  }

  _resetFocusMark({ mark } = {}) {
    if (mark && mark !== "series" && mark !== "point") return;
    const plot = this._state?.plot;
    if (!plot) return;

    plot
      .selectAll(".line-path")
      .attr("opacity", 1)
      .attr("stroke-width", function resetLineWidth() {
        const base = Number(this.getAttribute("data-base-stroke-width"));
        return Number.isFinite(base) && base > 0 ? base : 2;
      });

    plot
      .selectAll(".line-points circle")
      .attr("opacity", 1)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.25);
  }
}
