import * as d3 from "d3";
import { EncodingManager } from "./encoding-manager.js";

export class BarChartEncodingManager extends EncodingManager {
  getDefaultEncoding() {
    return {
      direction: "vertical",
      stack: false,
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

    if (
      merged.stack !== undefined &&
      merged.stack !== true &&
      merged.stack !== false &&
      !(typeof merged.stack === "string" && merged.stack.toLowerCase().trim() === "normalize")
    ) {
      throw new Error('Invalid encoding: "stack" must be true, false, or "normalize".');
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
    // Bar charts accept extra quantitative aliases used in mappings (`count`, `pow`).
    const isQuant = this._isQuantitativeScaleType(type, ["pow", "count"]);

    // For bars, domain should be driven by actual row arrays; otherwise use explicit user domain.
    const finalDomain = this._resolveScaleDomain(scaleConfig, data, field, type, { requireArrayData: true });
    if (!finalDomain?.length) return null;

    if (isColorScale) {
      if (isQuant) {
        const numericValues = this._extractNumericValues(data, field);
        const breaks = this._computeQuantitativeBreaks(scaleConfig, finalDomain, numericValues, `Color[${field}]`);
        if (breaks?.bins > 1) {
          const colors = this._buildThresholdColorRange(scaleConfig.range, breaks.bins, field);
          const thresholdScale = d3.scaleThreshold().domain(breaks.thresholds).range(colors);
          thresholdScale.__venusBounds = { min: breaks.min, max: breaks.max };
          return thresholdScale;
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

    // Non-color scales in bar charts are positional axes, so keep them continuous
    // (no threshold/binning for position) and default to normalized [0, 1] range.
    const range = scaleConfig.range || null;
    if (type === "linear") return d3.scaleLinear().domain(finalDomain).range(range || [0, 1]);
    if (type === "count") return d3.scaleLinear().domain(finalDomain).range(range || [0, 1]);
    if (type === "sqrt") return d3.scaleSqrt().domain(finalDomain).range(range || [0, 1]);
    if (type === "log") return d3.scaleLog().domain(finalDomain).range(range || [0, 1]);
    if (type === "pow") {
      const exponent = Number.isFinite(scaleConfig.exponent) ? Number(scaleConfig.exponent) : 1;
      return d3.scalePow().exponent(exponent).domain(finalDomain).range(range || [0, 1]);
    }
    return d3.scaleOrdinal().domain(finalDomain).range(range || []);
  }
}
