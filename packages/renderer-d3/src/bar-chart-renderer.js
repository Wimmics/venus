import * as d3 from "d3";
import CartesianChartRenderer from "./cartesian-chart-renderer.js";

export default class BarChartRenderer extends CartesianChartRenderer {
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
      visualArtifacts
    } = this._state || {};
    const yScaleConfig = mapping?.y?.scale || {};
    const yScaleType = String(yScaleConfig.type || "linear").toLowerCase();

    const direction = mapping.direction === "horizontal" ? "horizontal" : "vertical";
    const stackMode = this._resolveStackMode(mapping?.stack);
    const groupField = typeof mapping?.groups?.field === "string" ? mapping.groups.field.trim() : "";
    const barsEncoding = mapping?.bars || {};
    const colorEncoding = barsEncoding?.color || {};
    const sizeEncoding = barsEncoding?.size || {};
    const colorField = colorEncoding?.field;
    const sizeField = sizeEncoding?.field;
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
    const barSizeChannel =
      artifactChannels.find((item) => item?.mark === "bars" && item?.channel === "size") || null;
    const barColorScale = barColorChannel?.scaleId
      ? artifactScales.get(barColorChannel.scaleId) || null
      : null;
    const barSizeScale = barSizeChannel?.scaleId
      ? artifactScales.get(barSizeChannel.scaleId) || null
      : null;
    const defaultBarColor = barColorChannel?.defaultValue || colorEncoding?.value || "#69b3a2";
    const defaultBarStrokeWidth = barSizeChannel?.defaultValue ?? sizeEncoding?.value ?? 0;

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

    const strokeWidthForDatum = (datum) => {
      if (sizeField && barSizeScale) {
        const raw = Number(datum?.[sizeField]);
        if (Number.isFinite(raw)) {
          const scaled = Number(barSizeScale(raw));
          if (Number.isFinite(scaled) && scaled >= 0) return scaled;
        }
      }
      const fixed = Number(defaultBarStrokeWidth);
      return Number.isFinite(fixed) && fixed >= 0 ? fixed : 0;
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
          .attr("stroke", "#ffffff")
          .attr("stroke-width", (datum) => strokeWidthForDatum(datum.datum))
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
          .attr("stroke", "#ffffff")
          .attr("stroke-width", (datum) => strokeWidthForDatum(datum.datum))
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
          .attr("stroke", "#ffffff")
          .attr("stroke-width", (datum) => strokeWidthForDatum(datum.datum))
          .on("mouseover", (event, datum) => {
            this.callbacks.onBarHover?.(datum.datum, event.offsetX, event.offsetY);
          })
          .on("mouseout", () => {
            this.callbacks.onBarOut?.();
          });
      }

      return true;
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
        .attr("stroke", "#ffffff")
        .attr("stroke-width", (datum) => strokeWidthForDatum(datum.datum))
        .on("mouseover", (event, datum) => {
          this.callbacks.onBarHover?.(datum.datum, event.offsetX, event.offsetY);
        })
        .on("mouseout", () => {
          this.callbacks.onBarOut?.();
        });
      return true;
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
        .attr("stroke", "#ffffff")
        .attr("stroke-width", (datum) => strokeWidthForDatum(datum.datum))
        .on("mouseover", (event, datum) => {
          this.callbacks.onBarHover?.(datum.datum, event.offsetX, event.offsetY);
        })
        .on("mouseout", () => {
          this.callbacks.onBarOut?.();
        });
      return true;
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
      .attr("stroke", "#ffffff")
      .attr("stroke-width", (datum) => strokeWidthForDatum(datum.datum))
      .on("mouseover", (event, datum) => {
        this.callbacks.onBarHover?.(datum.datum, event.offsetX, event.offsetY);
      })
      .on("mouseout", () => {
        this.callbacks.onBarOut?.();
      });

    return true;
  }

  updateEncoding(encoding, chart = null, visualArtifacts = null) {
    this.encoding = encoding;
    if (this.encodingManager) this.encodingManager.clearScaleCache();
    this.render(chart || { rows: this.data }, encoding, visualArtifacts);
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
