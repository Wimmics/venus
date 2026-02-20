import * as d3 from "d3";

export default class BarChartRenderer {
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
    const yScaleConfig = mapping?.y?.scale || {};
    const yScaleType = String(yScaleConfig.type || "linear").toLowerCase();
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
    const stackMode = this._resolveStackMode(mapping?.stack);
    const groupField = typeof mapping?.groups?.field === "string" ? mapping.groups.field.trim() : "";
    const colorEncoding = mapping?.color || {};
    const colorField = colorEncoding?.field;
    const layoutMode = this._resolveLayoutMode(stackMode, groupField);
    const splitField =
      layoutMode === "grouped"
        ? groupField
        : (layoutMode === "stacked" || layoutMode === "normalize")
          ? (colorField || groupField || "")
          : "";

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
      if (!colorField || datum[colorField] === undefined || datum[colorField] === null) return defaultBarColor;
      if (!barColorScale) return defaultBarColor;
      const color = barColorScale(datum[colorField]);
      return color || defaultBarColor;
    };

    const requestedTickFormat = this._normalizeTickFormatName(yAxisConfig.tickFormat);
    if (
      (requestedTickFormat === "percent" || requestedTickFormat === "percentage") &&
      stackMode !== "normalize"
    ) {
      this.logger.warn(
        'BarChartRenderer: `y.axis.tickFormat: "percent"` is usually meaningful with `stack: "normalize"`. Current stack mode is non-normalized.'
      );
    }
    const yTickFormatter = this._buildTickFormatter(
      yAxisConfig.tickFormat || (stackMode === "normalize" ? "percent" : (yScaleType === "count" ? "integer" : "raw"))
    );
    const normalizedRows = this.data.map((datum) => {
      const x = String(datum?.[xField]);
      const yNum = Math.max(0, toNumeric(datum?.[yField]) || 0);
      const sub = splitField ? String(datum?.[splitField] ?? "undefined") : "__single__";
      return { x, y: yNum, sub, raw: datum };
    });
    const xCategories = Array.from(new Set(normalizedRows.map((row) => row.x)));
    const subCategories = this._resolveSubCategories(normalizedRows, splitField, colorField, barColorScale);
    const aggregated = this._aggregateByCategory(normalizedRows, xCategories, subCategories);

    const groupedBars = xCategories.flatMap((xCategory) =>
      subCategories.map((subCategory) => {
        const bucket = aggregated.get(xCategory)?.get(subCategory) || { value: 0, sample: null };
        const value = bucket.value || 0;
        const base = bucket.sample ? { ...bucket.sample } : {};
        base[xField] = xCategory;
        base[yField] = value;
        if (splitField) base[splitField] = subCategory;
        return {
          x: xCategory,
          sub: subCategory,
          value,
          datum: base,
          __observed: Boolean(bucket.sample)
        };
      })
    );
    const groupedBarsByCategory = new Map(
      xCategories.map((xCategory) => [
        xCategory,
        groupedBars.filter((item) => item.x === xCategory && item.__observed)
      ])
    );

    const stackedRows = xCategories.map((xCategory) => {
      const row = { __x: xCategory, __meta: {} };
      for (const subCategory of subCategories) {
        const bucket = aggregated.get(xCategory)?.get(subCategory) || { value: 0, sample: null };
        row[subCategory] = bucket.value || 0;
        const base = bucket.sample ? { ...bucket.sample } : {};
        base[xField] = xCategory;
        base[yField] = row[subCategory];
        if (splitField) base[splitField] = subCategory;
        row.__meta[subCategory] = base;
      }
      return row;
    });

    const groupedMax = d3.max(groupedBars, (item) => item.value) || 0;
    const stackedMax = d3.max(stackedRows, (row) => d3.sum(subCategories, (key) => Number(row[key]) || 0)) || 0;

    const domainFromEncoding = yScaleConfig.domain;

    const resolveValueDomain = (defaultMaxValue) => {
      if (stackMode === "normalize") return [0, 1];
      const yType = String(yScaleConfig.type || "linear").toLowerCase();
      if (Array.isArray(domainFromEncoding) && domainFromEncoding.length >= 2) {
        const minValue = Number(domainFromEncoding[0]);
        const maxValue = Number(domainFromEncoding[domainFromEncoding.length - 1]);
        if (yType === "log") {
          const baseMin = Math.max(1e-9, minValue);
          const baseMax = Math.max(baseMin * 10, maxValue);
          return [baseMin, Math.max(baseMax, defaultMaxValue)];
        }
        if (layoutMode === "stacked" || layoutMode === "normalize") {
          return [Math.min(0, minValue), Math.max(1, maxValue, defaultMaxValue)];
        }
        return [Math.min(0, minValue), Math.max(1, maxValue)];
      }
      return [0, Math.max(1, defaultMaxValue)];
    };

    if (direction === "vertical") {
      const xScale = d3.scaleBand().domain(xCategories).range([0, innerWidth]).padding(0.15);
      const yDomain = resolveValueDomain(layoutMode === "grouped" || layoutMode === "simple" ? groupedMax : stackedMax);
      const yScale = createValueScale(yDomain, [innerHeight, 0], yScaleConfig);

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
        .call(this._buildValueAxis("left", yScale, yTickFormatter, yAxisConfig, yScaleType))
        .selectAll("text")
        .attr("transform", `translate(${yLabelOffset.x},${yLabelOffset.y})`);

      if (layoutMode === "grouped") {
        const groupedBarsObserved = groupedBars.filter((item) => item.__observed);
        plot
          .append("g")
          .attr("class", "bars")
          .selectAll("rect")
          .data(groupedBarsObserved)
          .enter()
          .append("rect")
          .attr("x", (datum) => {
            const barsInCategory = groupedBarsByCategory.get(datum.x) || [];
            const localScale = d3
              .scaleBand()
              .domain(barsInCategory.map((item) => item.sub))
              .range([0, xScale.bandwidth()])
              .padding(0.12);
            return xScale(datum.x) + (localScale(datum.sub) || 0);
          })
          .attr("y", (datum) => yScale(datum.value))
          .attr("width", (datum) => {
            const barsInCategory = groupedBarsByCategory.get(datum.x) || [];
            const localScale = d3
              .scaleBand()
              .domain(barsInCategory.map((item) => item.sub))
              .range([0, xScale.bandwidth()])
              .padding(0.12);
            return localScale.bandwidth();
          })
          .attr("height", (datum) => Math.max(0, innerHeight - yScale(datum.value)))
          .attr("fill", (datum) => {
            if (!colorField) return colorForDatum(datum.datum);
            if (!barColorScale) return defaultBarColor;
            return barColorScale(datum.datum?.[colorField]) || defaultBarColor;
          })
          .on("mouseover", (event, datum) => {
            this.callbacks.onBarHover?.(datum.datum, event.offsetX, event.offsetY);
          })
          .on("mouseout", () => {
            this.callbacks.onBarOut?.();
          });
      } else if (layoutMode === "simple") {
        const simpleBars = xCategories.map((xCategory) => {
          const bucket = aggregated.get(xCategory)?.get("__single__") || { value: 0, sample: null };
          const value = bucket.value || 0;
          const base = bucket.sample ? { ...bucket.sample } : {};
          base[xField] = xCategory;
          base[yField] = value;
          return { x: xCategory, value, datum: base };
        });
        plot
          .append("g")
          .attr("class", "bars")
          .selectAll("rect")
          .data(simpleBars)
          .enter()
          .append("rect")
          .attr("x", (datum) => xScale(datum.x))
          .attr("y", (datum) => yScale(datum.value))
          .attr("width", xScale.bandwidth())
          .attr("height", (datum) => Math.max(0, innerHeight - yScale(datum.value)))
          .attr("fill", (datum) => colorForDatum(datum.datum))
          .on("mouseover", (event, datum) => {
            this.callbacks.onBarHover?.(datum.datum, event.offsetX, event.offsetY);
          })
          .on("mouseout", () => {
            this.callbacks.onBarOut?.();
          });
      } else {
        const stackGenerator = d3.stack().keys(subCategories);
        if (stackMode === "normalize") {
          stackGenerator.offset(d3.stackOffsetExpand);
        }
        const stackSeries = stackGenerator(stackedRows);
        plot
          .append("g")
          .attr("class", "bars")
          .selectAll("g")
          .data(stackSeries)
          .enter()
          .append("g")
          .selectAll("rect")
          .data((series) =>
            series.map((segment) => {
              const meta = segment.data?.__meta?.[series.key] || {};
              const value = Number(segment.data?.[series.key]) || 0;
              meta[xField] = segment.data?.__x;
              meta[yField] = value;
              if (splitField) meta[splitField] = series.key;
              return {
                key: series.key,
                segment,
                datum: meta
              };
            })
          )
          .enter()
          .append("rect")
          .attr("x", (datum) => xScale(datum.segment.data.__x))
          .attr("y", (datum) => yScale(datum.segment[1]))
          .attr("height", (datum) => Math.max(0, yScale(datum.segment[0]) - yScale(datum.segment[1])))
          .attr("width", xScale.bandwidth())
          .attr("fill", (datum) => colorForDatum(datum.datum))
          .on("mouseover", (event, datum) => {
            this.callbacks.onBarHover?.(datum.datum, event.offsetX, event.offsetY);
          })
          .on("mouseout", () => {
            this.callbacks.onBarOut?.();
          });
      }

      return;
    }

    const yScale = d3.scaleBand().domain(xCategories).range([0, innerHeight]).padding(0.15);
    const xDomain = resolveValueDomain(layoutMode === "grouped" || layoutMode === "simple" ? groupedMax : stackedMax);
    const xScale = createValueScale(xDomain, [0, innerWidth], yScaleConfig);

    plot
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(this._buildValueAxis("bottom", xScale, yTickFormatter, yAxisConfig, yScaleType));
    plot
      .append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("text-anchor", xLabelAngle ? "end" : "end")
      .attr("transform", xLabelAngle ? `translate(${xLabelOffset.x},${xLabelOffset.y}) rotate(${xLabelAngle})` : `translate(${xLabelOffset.x},${xLabelOffset.y})`);

    if (layoutMode === "grouped") {
      const groupedBarsObserved = groupedBars.filter((item) => item.__observed);
      plot
        .append("g")
        .attr("class", "bars")
        .selectAll("rect")
        .data(groupedBarsObserved)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (datum) => {
          const barsInCategory = groupedBarsByCategory.get(datum.x) || [];
          const localScale = d3
            .scaleBand()
            .domain(barsInCategory.map((item) => item.sub))
            .range([0, yScale.bandwidth()])
            .padding(0.12);
          return yScale(datum.x) + (localScale(datum.sub) || 0);
        })
        .attr("width", (datum) => Math.max(0, xScale(datum.value)))
        .attr("height", (datum) => {
          const barsInCategory = groupedBarsByCategory.get(datum.x) || [];
          const localScale = d3
            .scaleBand()
            .domain(barsInCategory.map((item) => item.sub))
            .range([0, yScale.bandwidth()])
            .padding(0.12);
          return localScale.bandwidth();
        })
        .attr("fill", (datum) => {
          if (!colorField) return colorForDatum(datum.datum);
          if (!barColorScale) return defaultBarColor;
          return barColorScale(datum.datum?.[colorField]) || defaultBarColor;
        })
        .on("mouseover", (event, datum) => {
          this.callbacks.onBarHover?.(datum.datum, event.offsetX, event.offsetY);
        })
        .on("mouseout", () => {
          this.callbacks.onBarOut?.();
        });
      return;
    }

    if (layoutMode === "simple") {
      const simpleBars = xCategories.map((xCategory) => {
        const bucket = aggregated.get(xCategory)?.get("__single__") || { value: 0, sample: null };
        const value = bucket.value || 0;
        const base = bucket.sample ? { ...bucket.sample } : {};
        base[xField] = xCategory;
        base[yField] = value;
        return { x: xCategory, value, datum: base };
      });

      plot
        .append("g")
        .attr("class", "bars")
        .selectAll("rect")
        .data(simpleBars)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (datum) => yScale(datum.x))
        .attr("width", (datum) => Math.max(0, xScale(datum.value)))
        .attr("height", yScale.bandwidth())
        .attr("fill", (datum) => colorForDatum(datum.datum))
        .on("mouseover", (event, datum) => {
          this.callbacks.onBarHover?.(datum.datum, event.offsetX, event.offsetY);
        })
        .on("mouseout", () => {
          this.callbacks.onBarOut?.();
        });
      return;
    }

    const stackGenerator = d3.stack().keys(subCategories);
    if (stackMode === "normalize") {
      stackGenerator.offset(d3.stackOffsetExpand);
    }
    const stackSeries = stackGenerator(stackedRows);
    plot
      .append("g")
      .attr("class", "bars")
      .selectAll("g")
      .data(stackSeries)
      .enter()
      .append("g")
      .selectAll("rect")
      .data((series) =>
        series.map((segment) => {
          const meta = segment.data?.__meta?.[series.key] || {};
          const value = Number(segment.data?.[series.key]) || 0;
          meta[xField] = segment.data?.__x;
          meta[yField] = value;
          if (splitField) meta[splitField] = series.key;
          return {
            key: series.key,
            segment,
            datum: meta
          };
        })
      )
      .enter()
      .append("rect")
      .attr("x", (datum) => xScale(datum.segment[0]))
      .attr("y", (datum) => yScale(datum.segment.data.__x))
      .attr("width", (datum) => Math.max(0, xScale(datum.segment[1]) - xScale(datum.segment[0])))
      .attr("height", yScale.bandwidth())
      .attr("fill", (datum) => colorForDatum(datum.datum))
      .on("mouseover", (event, datum) => {
        this.callbacks.onBarHover?.(datum.datum, event.offsetX, event.offsetY);
      })
      .on("mouseout", () => {
        this.callbacks.onBarOut?.();
      });
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
    const key = this._normalizeTickFormatName(formatName);
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

  _normalizeTickFormatName(formatName) {
    return typeof formatName === "string" ? formatName.toLowerCase().trim() : "";
  }

  _buildValueAxis(orientation, scale, tickFormatter, axisConfig = {}, scaleType = "") {
    const axis =
      orientation === "left" ? d3.axisLeft(scale) : d3.axisBottom(scale);
    axis.tickFormat(tickFormatter);

    const normalizedScaleType = String(scaleType || "").toLowerCase();
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

  _resolveStackMode(stack) {
    if (stack === true) return "stacked";
    if (typeof stack === "string" && stack.toLowerCase().trim() === "normalize") return "normalize";
    return "none";
  }

  _resolveLayoutMode(stackMode, groupField) {
    if (stackMode === "stacked" || stackMode === "normalize") return stackMode;
    if (groupField) return "grouped";
    return "simple";
  }

  _resolveSubCategories(rows, splitField, colorField, barColorScale) {
    if (!splitField) return ["__single__"];
    const observed = Array.from(new Set(rows.map((row) => row.sub)));
    const canUseColorOrder = splitField === colorField;
    const scaleDomain = canUseColorOrder && typeof barColorScale?.domain === "function" ? barColorScale.domain() : [];
    if (!Array.isArray(scaleDomain) || !scaleDomain.length) return observed;
    const ordered = [];
    for (const value of scaleDomain.map((item) => String(item))) {
      if (observed.includes(value)) ordered.push(value);
    }
    for (const value of observed) {
      if (!ordered.includes(value)) ordered.push(value);
    }
    return ordered;
  }

  _aggregateByCategory(rows, xCategories, subCategories) {
    const aggregated = new Map();
    for (const xCategory of xCategories) {
      const subMap = new Map();
      for (const subCategory of subCategories) {
        subMap.set(subCategory, { value: 0, sample: null });
      }
      aggregated.set(xCategory, subMap);
    }

    for (const row of rows) {
      if (!aggregated.has(row.x)) continue;
      const subMap = aggregated.get(row.x);
      if (!subMap.has(row.sub)) subMap.set(row.sub, { value: 0, sample: null });
      const bucket = subMap.get(row.sub);
      bucket.value += row.y;
      if (!bucket.sample) bucket.sample = row.raw;
      subMap.set(row.sub, bucket);
    }
    return aggregated;
  }
}
