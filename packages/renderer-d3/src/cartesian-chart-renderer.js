import * as d3 from "d3";
import BaseRenderer from "./base-renderer.js";
import {
  computeAxisAwareMargins,
  measurePlotOverflow,
  shouldRefitLayout,
  growMargins
} from "./utils/layout-fit.js";

export default class CartesianChartRenderer extends BaseRenderer {
  constructor(opts = {}) {
    super(opts);
    this.data = [];
    this._fitPass = 0;
    this._marginOverride = null;
  }

  _defaultPayload() {
    return { rows: this.data };
  }

  _ingestRenderPayload(payload = { rows: [] }) {
    this.data = Array.isArray(payload?.rows) ? payload.rows : [];
  }

  _validateState() {
    if (!this.data.length) return "No data to visualize";
    const mapping = this._state?.mapping || {};
    if (!mapping?.x?.field || !mapping?.y?.field) {
      return 'Invalid encoding: "x.field" and "y.field" are required';
    }
    return null;
  }

  _onValidationFailed() {
    this._resetFitState();
  }

  _prepareRenderState() {
    const mapping = this._state?.mapping || {};
    const xAxisConfig = mapping?.x?.axis || {};
    const yAxisConfig = mapping?.y?.axis || {};
    const xLabelAngle = Number.isFinite(Number(xAxisConfig.labelAngle)) ? Number(xAxisConfig.labelAngle) : 0;
    const xLabelOffset = this._normalizeOffset(xAxisConfig.labelOffset);
    const yLabelOffset = this._normalizeOffset(yAxisConfig.labelOffset);
    const margin = this._marginOverride || this._computeMargins({ xLabelAngle, xLabelOffset, yLabelOffset });
    const innerWidth = Math.max(1, this._state.width - margin.left - margin.right);
    const innerHeight = Math.max(1, this._state.height - margin.top - margin.bottom);

    const plot = this.svg
      .append("g")
      .attr("class", "plot-area")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    Object.assign(this._state, {
      xAxisConfig,
      yAxisConfig,
      xLabelAngle,
      xLabelOffset,
      yLabelOffset,
      margin,
      innerWidth,
      innerHeight,
      xField: mapping?.x?.field,
      yField: mapping?.y?.field,
      plot
    });
  }

  _afterRender() {
    const { payload, visualArtifacts, width, height, margin } = this._state || {};
    return this._finalizeLayout({
      payload,
      encoding: this.encoding,
      visualArtifacts,
      width,
      height,
      margin
    });
  }

  _getMarginBase() {
    return { top: 24, right: 20, bottom: 64, left: 64 };
  }

  _computeMargins({ xLabelAngle = 0, xLabelOffset = { x: 0, y: 0 }, yLabelOffset = { x: 0, y: 0 } }) {
    return computeAxisAwareMargins({
      xLabelAngle,
      xLabelOffset,
      yLabelOffset,
      base: this._getMarginBase()
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

  _normalizeTickFormatName(formatName) {
    return typeof formatName === "string" ? formatName.toLowerCase().trim() : "";
  }

  _buildTickFormatter(formatName, opts = {}) {
    const key = this._normalizeTickFormatName(formatName);
    const fallback = opts.fallback || "number";
    if (fallback === "string" && (!key || key === "raw")) return (value) => String(value);
    if (!key || key === "raw") return (value) => d3.format(",")(value);
    if (key === "percent" || key === "percentage") return (value) => d3.format(".0%")(value);
    if (key === "compact") {
      const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
      return (value) => compact.format(value);
    }
    if (key === "kmb") {
      return (value) => {
        const num = Number(value);
        if (!Number.isFinite(num)) return String(value);
        const abs = Math.abs(num);
        if (abs >= 1e12) return `${d3.format(".2~f")(num / 1e12)}T`;
        if (abs >= 1e9) return `${d3.format(".2~f")(num / 1e9)}B`;
        if (abs >= 1e6) return `${d3.format(".2~f")(num / 1e6)}M`;
        if (abs >= 1e3) return `${d3.format(".2~f")(num / 1e3)}k`;
        return d3.format(".2~f")(num);
      };
    }
    if (key === "k" || key === "thousands") return (value) => `${d3.format(".2~f")(Number(value) / 1e3)}k`;
    if (key === "m" || key === "millions") return (value) => `${d3.format(".2~f")(Number(value) / 1e6)}M`;
    if (key === "b" || key === "billions") return (value) => `${d3.format(".2~f")(Number(value) / 1e9)}B`;
    if (key === "integer" || key === "int") return (value) => d3.format(",d")(Math.round(Number(value) || 0));
    return (value) => d3.format(",")(value);
  }

  _buildValueAxis(orientation, scale, tickFormatter, axisConfig = {}, scaleType = "") {
    const axis = orientation === "left" ? d3.axisLeft(scale) : d3.axisBottom(scale);
    axis.tickFormat(tickFormatter);

    const normalizedScaleType = String(scaleType || "").toLowerCase();
    if (normalizedScaleType === "log") {
      const domain = typeof scale.domain === "function" ? scale.domain() : null;
      if (!Array.isArray(domain) || domain.length < 2) return axis;
      const start = Number(domain[0]);
      const end = Number(domain[domain.length - 1]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0 || end < start) {
        return axis;
      }

      const minExp = Math.ceil(Math.log10(start));
      const maxExp = Math.floor(Math.log10(end));
      if (!Number.isFinite(minExp) || !Number.isFinite(maxExp) || maxExp < minExp) return axis;

      const tickValues = [];
      for (let exp = minExp; exp <= maxExp; exp += 1) {
        tickValues.push(10 ** exp);
        if (tickValues.length > 24) break;
      }

      if (tickValues.length > 0) {
        axis.tickValues(tickValues);
      } else {
        axis.ticks(8);
      }
      return axis;
    }

    const tickStep = Number(axisConfig.tickStep);
    const effectiveStep = Number.isFinite(tickStep) && tickStep > 0
      ? tickStep
      : (normalizedScaleType === "count" ? 1 : null);
    if (!effectiveStep) return axis;

    const domain = typeof scale.domain === "function" ? scale.domain() : null;
    if (!Array.isArray(domain) || domain.length < 2) return axis;
    const start = Number(domain[0]);
    const end = Number(domain[domain.length - 1]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return axis;

    const firstTick = Math.ceil(start / effectiveStep) * effectiveStep;
    const tickValues = [];
    for (let value = firstTick; value <= end + effectiveStep * 1e-9; value += effectiveStep) {
      tickValues.push(Number(value.toFixed(12)));
      if (tickValues.length > 2000) break;
    }
    if (tickValues.length > 0) {
      axis.tickValues(tickValues);
    }

    return axis;
  }

  _resolveAxisTitle(axisConfig, fieldFallback) {
    const hasTitleTag = Boolean(
      axisConfig &&
      typeof axisConfig === "object" &&
      Object.prototype.hasOwnProperty.call(axisConfig, "title")
    );

    if (hasTitleTag) {
      const titleConfig = axisConfig.title;

      if (titleConfig && typeof titleConfig === "object") {
        const display = titleConfig.display !== false;
        if (!display) return "";
        if (Object.prototype.hasOwnProperty.call(titleConfig, "value")) {
          return titleConfig.value === null || titleConfig.value === undefined ? "" : String(titleConfig.value);
        }
        return "";
      }

      if (titleConfig === null || titleConfig === undefined) return "";
      return String(titleConfig);
    }

    return typeof fieldFallback === "string" && fieldFallback.trim() ? fieldFallback : "";
  }

  _renderAxisTitles({ plot, innerWidth, innerHeight, bottomTitle = "", leftTitle = "" }) {
    if (bottomTitle) {
      plot
        .append("text")
        .attr("class", "axis-title axis-title-x")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 46)
        .attr("text-anchor", "middle")
        .style("fill", "#333")
        .style("font-size", "12px")
        .text(bottomTitle);
    }

    if (leftTitle) {
      plot
        .append("text")
        .attr("class", "axis-title axis-title-y")
        .attr("transform", `translate(${-52},${innerHeight / 2}) rotate(-90)`)
        .attr("text-anchor", "middle")
        .style("fill", "#333")
        .style("font-size", "12px")
        .text(leftTitle);
    }
  }

  _finalizeLayout({ payload, encoding, visualArtifacts, width, height, margin }) {
    const svgNode = this.svg?.node?.();
    const overflow = measurePlotOverflow(svgNode, ".plot-area", width, height);
    const shouldRefit = shouldRefitLayout(overflow);

    if (!shouldRefit || this._fitPass >= 1) {
      this._resetFitState();
      return;
    }

    this._fitPass += 1;
    this._marginOverride = growMargins(margin, overflow, 6);
    this.render(payload, encoding, visualArtifacts);
  }

  _resetFitState() {
    this._fitPass = 0;
    this._marginOverride = null;
  }

  destroy() {
    super.destroy();
    this._resetFitState();
  }
}
