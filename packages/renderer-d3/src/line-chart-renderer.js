import * as d3 from "d3";
import {
  computeAxisAwareMargins,
  measurePlotOverflow,
  shouldRefitLayout,
  growMargins
} from "./layout-fit.js";

export default class LineChartRenderer {
  constructor(opts = {}) {
    this.container = opts.container || null;
    this.encodingManager = opts.encodingManager || null;
    this.width = opts.width || 800;
    this.height = opts.height || 500;
    this.logger = opts.logger || console;
    this.callbacks = opts.callbacks || {};
    this.svg = null;
    this.data = [];
    this.encoding = null;
    this._fitPass = 0;
    this._marginOverride = null;
  }

  render(chart = { rows: [] }, encoding = null, visualArtifacts = null) {
    this.data = Array.isArray(chart?.rows) ? chart.rows : [];
    this.encoding = encoding || this.encoding;

    if (!this.container) throw new Error("LineChartRenderer requires a container element");

    this.svg = d3.select(this.container.querySelector("svg"));
    this.svg.selectAll("*").remove();

    const mapping = this.encoding || {};
    const width = this.width;
    const height = this.height;
    const xAxisConfig = mapping?.x?.axis || {};
    const yAxisConfig = mapping?.y?.axis || {};
    const xLabelAngle = Number.isFinite(Number(xAxisConfig.labelAngle)) ? Number(xAxisConfig.labelAngle) : 0;
    const xLabelOffset = this._normalizeOffset(xAxisConfig.labelOffset);
    const yLabelOffset = this._normalizeOffset(yAxisConfig.labelOffset);
    const margin = this._marginOverride || this._computeMargins({
      xLabelAngle,
      xLabelOffset,
      yLabelOffset
    });
    const innerWidth = Math.max(1, width - margin.left - margin.right);
    const innerHeight = Math.max(1, height - margin.top - margin.bottom);

    if (!this.data.length) {
      this.svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("No data to visualize");
      this._resetFitState();
      return;
    }

    const xField = mapping?.x?.field;
    const yField = mapping?.y?.field;
    if (!xField || !yField) {
      this.svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text('Invalid encoding: "x.field" and "y.field" are required');
      this._resetFitState();
      return;
    }

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
      this.svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("No plottable rows found for the selected x/y fields");
      this._resetFitState();
      return;
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

    const plot = this.svg
      .append("g")
      .attr("class", "plot-area")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    plot
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
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
      .call(d3.axisLeft(yScale));

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
        .attr("fill", "none")
        .attr("stroke", stroke)
        .attr("stroke-width", strokeWidth)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", lineGenerator);

      if (pointsEnabled) {
        plot
          .append("g")
          .attr("class", "line-points")
          .selectAll("circle")
          .data(sorted)
          .enter()
          .append("circle")
          .attr("cx", (item) => useContinuousX ? xScale(Number(item.xRaw)) : xScale(String(item.xRaw)))
          .attr("cy", (item) => yScale(item.y))
          .attr("r", (item) => resolvePointRadius(item.row, strokeWidth))
          .attr("fill", (item) => resolvePointColor(item.row, stroke))
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.25)
          .on("mouseover", (event, item) => {
            this.callbacks.onPointHover?.(item.row, event.offsetX, event.offsetY);
          })
          .on("mouseout", () => {
            this.callbacks.onPointOut?.();
          });
      }
    }

    return this._finalizeLayout({
      chart,
      encoding,
      visualArtifacts,
      width,
      height,
      margin
    });
  }

  updateData(chart, encoding = null, visualArtifacts = null) {
    this.render(chart, encoding, visualArtifacts);
  }

  updateEncoding(encoding, chart = null, visualArtifacts = null) {
    this.render(chart || { rows: this.data }, encoding, visualArtifacts);
  }

  resize(width, height, chart = null, encoding = null, visualArtifacts = null) {
    this.width = width || this.width;
    this.height = height || this.height;
    this.render(chart || { rows: this.data }, encoding || this.encoding, visualArtifacts);
  }

  destroy() {
    if (this.svg) this.svg.selectAll("*").remove();
    this._resetFitState();
  }

  _computeMargins({ xLabelAngle = 0, xLabelOffset = { x: 0, y: 0 }, yLabelOffset = { x: 0, y: 0 } }) {
    return computeAxisAwareMargins({
      xLabelAngle,
      xLabelOffset,
      yLabelOffset,
      base: { top: 24, right: 36, bottom: 64, left: 64 }
    });
  }

  _normalizeOffset(offsetValue) {
    if (Array.isArray(offsetValue)) {
      const x = Number(offsetValue[0]);
      const y = Number(offsetValue[1]);
      return {
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0
      };
    }

    if (offsetValue && typeof offsetValue === "object") {
      const x = Number(offsetValue.x);
      const y = Number(offsetValue.y);
      return {
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0
      };
    }

    const scalar = Number(offsetValue);
    return {
      x: Number.isFinite(scalar) ? scalar : 0,
      y: Number.isFinite(scalar) ? scalar : 0
    };
  }

  _finalizeLayout({ chart, encoding, visualArtifacts, width, height, margin }) {
    const svgNode = this.svg?.node?.();
    const overflow = measurePlotOverflow(svgNode, ".plot-area", width, height);
    const shouldRefit = shouldRefitLayout(overflow);

    if (!shouldRefit || this._fitPass >= 1) {
      this._resetFitState();
      return;
    }

    this._fitPass += 1;
    this._marginOverride = growMargins(margin, overflow, 6);
    this.render(chart, encoding, visualArtifacts);
  }

  _resetFitState() {
    this._fitPass = 0;
    this._marginOverride = null;
  }
}
