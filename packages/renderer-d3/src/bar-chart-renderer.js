import * as d3 from "d3";

export default class BarChartRenderer {
  constructor(opts = {}) {
    this.container = opts.container || null;
    this.encodingManager = opts.encodingManager || null;
    this.width = opts.width || 800;
    this.height = opts.height || 500;
    this.logger = opts.logger || console;
    this.svg = null;
    this.data = [];
    this.encoding = null;
  }

  render(chart = { rows: [] }, encoding = null, visualArtifacts = null) {
    this.data = Array.isArray(chart?.rows) ? chart.rows : [];
    this.encoding = encoding || this.encoding;

    if (!this.container) throw new Error("BarChartRenderer requires a container element");

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
    const margin = this._computeMargins({
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
      return;
    }

    const direction = mapping.direction === "horizontal" ? "horizontal" : "vertical";
    const colorEncoding = mapping?.color || {};

    const artifactChannels = Array.isArray(visualArtifacts?.channels) ? visualArtifacts.channels : [];
    const artifactScales = visualArtifacts?.scales instanceof Map ? visualArtifacts.scales : new Map();
    const barColorChannel =
      artifactChannels.find((item) => item?.mark === "bars" && item?.channel === "color") || null;
    const barColorScale = barColorChannel?.scaleId
      ? artifactScales.get(barColorChannel.scaleId) || null
      : null;
    const defaultBarColor = barColorChannel?.defaultValue || colorEncoding?.value || "#69b3a2";

    const plot = this.svg
      .append("g")
      .attr("class", "plot-area")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const toNumeric = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    const createValueScale = (domain, range, scaleConfig = {}) => {
      const type = scaleConfig.type || "linear";
      if (type === "log") {
        const safeMin = Math.max(1e-9, Number(domain[0]));
        const safeMax = Math.max(safeMin * 10, Number(domain[1]));
        return d3.scaleLog().domain([safeMin, safeMax]).range(range).nice();
      }
      if (type === "sqrt") return d3.scaleSqrt().domain(domain).range(range).nice();
      if (type === "pow") {
        const exponent = Number.isFinite(scaleConfig.exponent) ? Number(scaleConfig.exponent) : 1;
        return d3.scalePow().exponent(exponent).domain(domain).range(range).nice();
      }
      return d3.scaleLinear().domain(domain).range(range).nice();
    };

    const colorForDatum = (datum) => {
      const colorField = colorEncoding?.field;
      if (!colorField || datum[colorField] === undefined || datum[colorField] === null) return defaultBarColor;
      if (!barColorScale) return defaultBarColor;
      const color = barColorScale(datum[colorField]);
      return color || defaultBarColor;
    };

    const yTickFormatter = this._buildTickFormatter(yAxisConfig.tickFormat);

    if (direction === "vertical") {
      const categories = this.data.map((datum) => String(datum[xField]));
      const xScale = d3.scaleBand().domain(categories).range([0, innerWidth]).padding(0.15);

      const values = this.data.map((datum) => toNumeric(datum[yField])).filter((value) => value !== null);
      const domainFromEncoding = mapping?.y?.scale?.domain;
      const yDomain =
        Array.isArray(domainFromEncoding) && domainFromEncoding.length >= 2
          ? [Number(domainFromEncoding[0]), Number(domainFromEncoding[domainFromEncoding.length - 1])]
          : [0, Math.max(1, d3.max(values) || 1)];
      const yScale = createValueScale(yDomain, [innerHeight, 0], mapping?.y?.scale || {});

      plot
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("text-anchor", xLabelAngle ? "end" : "middle")
        .attr("transform", xLabelAngle ? `translate(${xLabelOffset.x},${xLabelOffset.y}) rotate(${xLabelAngle})` : `translate(${xLabelOffset.x},${xLabelOffset.y})`);

      plot
        .append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale).tickFormat(yTickFormatter))
        .selectAll("text")
        .attr("transform", `translate(${yLabelOffset.x},${yLabelOffset.y})`);

      plot
        .append("g")
        .attr("class", "bars")
        .selectAll("rect")
        .data(this.data)
        .enter()
        .append("rect")
        .attr("x", (datum) => xScale(String(datum[xField])))
        .attr("y", (datum) => yScale(Math.max(0, toNumeric(datum[yField]) || 0)))
        .attr("width", xScale.bandwidth())
        .attr("height", (datum) => Math.max(0, innerHeight - yScale(Math.max(0, toNumeric(datum[yField]) || 0))))
        .attr("fill", (datum) => colorForDatum(datum));

      return;
    }

    const categories = this.data.map((datum) => String(datum[xField]));
    const yScale = d3.scaleBand().domain(categories).range([0, innerHeight]).padding(0.15);

    const values = this.data.map((datum) => toNumeric(datum[yField])).filter((value) => value !== null);
    const domainFromEncoding = mapping?.y?.scale?.domain;
    const xDomain =
      Array.isArray(domainFromEncoding) && domainFromEncoding.length >= 2
        ? [Number(domainFromEncoding[0]), Number(domainFromEncoding[domainFromEncoding.length - 1])]
        : [0, Math.max(1, d3.max(values) || 1)];
    const xScale = createValueScale(xDomain, [0, innerWidth], mapping?.y?.scale || {});

    plot
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(yTickFormatter));
    plot
      .append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("text-anchor", xLabelAngle ? "end" : "end")
      .attr("transform", xLabelAngle ? `translate(${xLabelOffset.x},${xLabelOffset.y}) rotate(${xLabelAngle})` : `translate(${xLabelOffset.x},${xLabelOffset.y})`);

    plot
      .append("g")
      .attr("class", "bars")
      .selectAll("rect")
      .data(this.data)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (datum) => yScale(String(datum[xField])))
      .attr("width", (datum) => Math.max(0, xScale(Math.max(0, toNumeric(datum[yField]) || 0))))
      .attr("height", yScale.bandwidth())
      .attr("fill", (datum) => colorForDatum(datum));
  }

  updateData(chart = { rows: [] }) {
    this.render(chart, this.encoding);
  }

  updateEncoding(encoding) {
    this.encoding = encoding;
    if (this.encodingManager) this.encodingManager.clearScaleCache();
    this.updateData({ rows: this.data });
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.render({ rows: this.data }, this.encoding);
  }

  destroy() {
    if (this.svg) {
      this.svg.selectAll("*").remove();
      this.svg = null;
    }
  }

  _normalizeOffset(offset) {
    if (!offset || typeof offset !== "object") return { x: 0, y: 0 };
    const x = Number(offset.x);
    const y = Number(offset.y);
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0
    };
  }

  _computeMargins({ xLabelAngle = 0, xLabelOffset = { x: 0, y: 0 }, yLabelOffset = { x: 0, y: 0 } }) {
    const angle = Math.min(90, Math.max(-90, xLabelAngle));
    const angledExtra = Math.abs(angle) > 0 ? 24 + Math.abs(angle) * 1.1 : 0;
    const bottom = Math.max(64, 44 + angledExtra + Math.abs(xLabelOffset.y) + Math.abs(xLabelOffset.x) * 0.3);
    const left = Math.max(64, 56 + Math.abs(yLabelOffset.x) + Math.abs(yLabelOffset.y) * 0.4);

    return {
      top: 24,
      right: 20,
      bottom,
      left
    };
  }

  _buildTickFormatter(formatName) {
    const key = typeof formatName === "string" ? formatName.toLowerCase().trim() : "";
    if (!key || key === "raw") return (value) => d3.format(",")(value);
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
    return (value) => d3.format(",")(value);
  }
}
