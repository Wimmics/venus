import * as d3 from "d3";
import { EncodingManager } from "./encoding-manager.js";

export class BarChartEncodingManager extends EncodingManager {
  getDefaultEncoding() {
    return {
      description: "Default bar-chart encoding",
      width: 800,
      height: 500,
      autosize: "none",
      direction: "vertical",
      x: {
        field: "category",
        axis: { labelAngle: 0 }
      },
      y: {
        field: "value",
        scale: { type: "linear" },
        axis: {}
      },
      color: {
        value: "#69b3a2",
        legend: { display: false, title: "Color", position: "bottom" }
      }
    };
  }

  createAdaptiveEncoding(sparqlVars) {
    const enc = this.getDefaultEncoding();
    if (!Array.isArray(sparqlVars) || sparqlVars.length === 0) return enc;
    enc.x.field = sparqlVars[0];
    if (sparqlVars.length > 1) {
      enc.y.field = sparqlVars[1];
    } else {
      enc.y.field = sparqlVars[0];
    }
    if (sparqlVars.length > 2) {
      enc.color.field = sparqlVars[2];
      enc.color.scale = { type: "ordinal", range: "Set3" };
      enc.color.legend.display = true;
      enc.color.legend.title = sparqlVars[2];
    }
    return enc;
  }

  resolveFieldMapping(mapping, vars) {
    const xField = mapping?.x?.field && vars.includes(mapping.x.field) ? mapping.x.field : vars[0];
    const yField = mapping?.y?.field && vars.includes(mapping.y.field) ? mapping.y.field : vars[1] || vars[0];
    const colorField =
      mapping?.color?.field && vars.includes(mapping.color.field) ? mapping.color.field : null;
    return { xField, yField, colorField };
  }

  deriveEncoding(userEncoding, sparqlVars, sparqlData) {
    if (userEncoding === null) {
      const vars = sparqlVars || sparqlData?.head?.vars || [];
      return this.createAdaptiveEncoding(vars);
    }

    const merged = {
      ...this.getDefaultEncoding(),
      ...(userEncoding || {}),
      x: { ...this.getDefaultEncoding().x, ...(userEncoding?.x || {}) },
      y: { ...this.getDefaultEncoding().y, ...(userEncoding?.y || {}) },
      color: { ...this.getDefaultEncoding().color, ...(userEncoding?.color || {}) }
    };

    if (!merged?.x?.field || !merged?.y?.field) {
      throw new Error('Invalid encoding: "x.field" and "y.field" are required for bar-chart.');
    }

    return merged;
  }

  populateDomainsFromData(encoding, rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) return encoding;
    const enc = JSON.parse(JSON.stringify(encoding || {}));

    if (enc.color?.field && enc.color?.scale) {
      const scaleType = enc.color.scale.type || "ordinal";
      const userDomain = enc.color.scale.domain;
      enc.color.scale.domain = this.domainCalculator.getDomain(rows, enc.color.field, userDomain, scaleType);
    }

    if (enc.x?.field && enc.x?.scale) {
      const scaleType = enc.x.scale.type || "ordinal";
      enc.x.scale.domain = this.domainCalculator.getDomain(rows, enc.x.field, enc.x.scale.domain, scaleType);
    }

    if (enc.y?.field && enc.y?.scale) {
      const scaleType = enc.y.scale.type || "linear";
      enc.y.scale.domain = this.domainCalculator.getDomain(rows, enc.y.field, enc.y.scale.domain, scaleType);
    }

    return enc;
  }

  createD3Scale(scaleConfig, data, field, isColorScale) {
    if (!scaleConfig) return null;
    const type = scaleConfig.type || "ordinal";
    const isQuant =
      type === "linear" ||
      type === "sqrt" ||
      type === "log" ||
      type === "pow" ||
      type === "quantitative" ||
      type === "sequential";

    let finalDomain = null;
    if (Array.isArray(data) && data.length && field) {
      finalDomain = this.domainCalculator.getDomain(data, field, scaleConfig.domain, type);
    } else if (Array.isArray(scaleConfig.domain) && scaleConfig.domain.length) {
      finalDomain = scaleConfig.domain;
    }
    if (!finalDomain?.length) return null;

    if (isColorScale) {
      if (isQuant) {
        const binningOptions = this._resolveBinningOptions(scaleConfig);
        const numericValues = (Array.isArray(data) ? data : [])
          .map((item) => this.domainCalculator.convertToNumber(item?.[field]))
          .filter((value) => !isNaN(value));

        if (binningOptions.enabled && numericValues.length > 1 && this.binBreaksCalculator) {
          const domainMin = Number(finalDomain[0]);
          const domainMax = Number(finalDomain[finalDomain.length - 1]);
          const effectiveMin =
            Number.isFinite(binningOptions.min) ? binningOptions.min : (Number.isFinite(domainMin) ? domainMin : null);
          const effectiveMax =
            Number.isFinite(binningOptions.max) ? binningOptions.max : (Number.isFinite(domainMax) ? domainMax : null);
          const breaks = this.binBreaksCalculator.computeBreaks(numericValues, {
            method: binningOptions.method,
            bins: binningOptions.bins,
            breaks: binningOptions.breaks,
            min: effectiveMin,
            max: effectiveMax,
            label: `Color[${field}]`,
            quantitative: true
          });
          const binCount = breaks.bins;
          if (binCount > 1) {
            const colors = this._buildThresholdColorRange(scaleConfig.range, binCount, field);
            const thresholdScale = d3.scaleThreshold().domain(breaks.thresholds).range(colors);
            thresholdScale.__kgnovisBounds = { min: breaks.min, max: breaks.max };
            return thresholdScale;
          }
        }
      }

      return this.colorScaleCalculator.createColorScale({
        domain: finalDomain,
        range: scaleConfig.range || null,
        scaleType: isQuant ? "quantitative" : "ordinal",
        fallbackInterpolator: null,
        label: `Color[${field}]`
      });
    }

    const range = scaleConfig.range || null;
    if (type === "linear") return d3.scaleLinear().domain(finalDomain).range(range || [0, 1]);
    if (type === "sqrt") return d3.scaleSqrt().domain(finalDomain).range(range || [0, 1]);
    if (type === "log") return d3.scaleLog().domain(finalDomain).range(range || [0, 1]);
    if (type === "pow") {
      const exponent = Number.isFinite(scaleConfig.exponent) ? Number(scaleConfig.exponent) : 1;
      return d3.scalePow().exponent(exponent).domain(finalDomain).range(range || [0, 1]);
    }
    return d3.scaleOrdinal().domain(finalDomain).range(range || []);
  }

  _resolveBinningOptions(scaleConfig) {
    const raw = scaleConfig?.binning;
    if (raw === false) return { enabled: false, method: "jenks", bins: 1, breaks: null, min: null, max: null };
    const method = raw?.method === "quartiles" ? "quartiles" : "jenks";
    const bins = Number.isFinite(raw?.bins) ? Math.max(1, Math.floor(raw.bins)) : 5;
    const breaks = Array.isArray(raw?.breaks) ? raw.breaks : null;
    const min = Number.isFinite(raw?.min) ? Number(raw.min) : null;
    const max = Number.isFinite(raw?.max) ? Number(raw.max) : null;
    return { enabled: true, method, bins, breaks, min, max };
  }

  _buildThresholdColorRange(range, binCount, field) {
    const dummyDomain = Array.from({ length: binCount }, (_, index) => index);
    const paletteScale = this.colorScaleCalculator.createColorScale({
      domain: dummyDomain,
      range,
      scaleType: "ordinal",
      fallbackInterpolator: null,
      label: `Color[${field}]`
    });
    const palette = paletteScale?.range?.() || [];
    if (palette.length >= binCount) return palette.slice(0, binCount);
    const fallback = this.colorScaleCalculator.getColorPalette("Category10", binCount, "ordinal");
    return Array.from(
      { length: binCount },
      (_, index) => palette[index % palette.length] || fallback[index % fallback.length] || "#999"
    );
  }
}
