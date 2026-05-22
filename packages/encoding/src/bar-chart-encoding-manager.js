import * as d3 from "d3";
import { EncodingManager } from "./encoding-manager.js";
import { getDefaultEncodingTemplate } from "./default-encodings.js";

export class BarChartEncodingManager extends EncodingManager {
  getDefaultEncoding() {
    return getDefaultEncodingTemplate("bar-chart");
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
    return enc;
  }

  resolveFieldMapping(mapping, vars) {
    const xField = mapping?.x?.field && vars.includes(mapping.x.field) ? mapping.x.field : vars[0];
    const yField = mapping?.y?.field && vars.includes(mapping.y.field) ? mapping.y.field : vars[1] || vars[0];
    const colorCandidate = mapping?.bars?.color?.field;
    const colorField = colorCandidate && vars.includes(colorCandidate) ? colorCandidate : null;
    const groupField =
      mapping?.bars?.groups?.field && vars.includes(mapping.bars.groups.field)
        ? mapping.bars.groups.field
        : null;
    return { xField, yField, colorField, groupField };
  }

  deriveEncoding(userEncoding, sparqlVars, sparqlData) {
    if (userEncoding === null) {
      const vars = sparqlVars || sparqlData?.head?.vars || [];
      return this.createAdaptiveEncoding(vars);
    }

    const merged = {
      ...this.getDefaultEncoding(),
      ...(userEncoding || {}),
      interactions: {
        ...this.getDefaultEncoding().interactions,
        ...(userEncoding?.interactions || {})
      },
      x: { ...this.getDefaultEncoding().x, ...(userEncoding?.x || {}) },
      y: { ...this.getDefaultEncoding().y, ...(userEncoding?.y || {}) },
      bars: {
        ...this.getDefaultEncoding().bars,
        ...(userEncoding?.bars || {}),
        groups: {
          ...this.getDefaultEncoding().bars.groups,
          ...(userEncoding?.bars?.groups || {})
        },
        stack:
          userEncoding?.bars && Object.prototype.hasOwnProperty.call(userEncoding.bars, "stack")
            ? userEncoding.bars.stack
            : this.getDefaultEncoding().bars.stack,
        color: {
          ...this.getDefaultEncoding().bars.color,
          ...(userEncoding?.bars?.color || {})
        },
        size: {
          ...this.getDefaultEncoding().bars.size,
          ...(userEncoding?.bars?.size || {})
        }
      }
    };

    if (userEncoding && Object.prototype.hasOwnProperty.call(userEncoding, "groups")) {
      throw new Error('Invalid encoding: top-level "groups" is no longer supported. Use "bars.groups" instead.');
    }

    if (userEncoding && Object.prototype.hasOwnProperty.call(userEncoding, "stack")) {
      throw new Error('Invalid encoding: top-level "stack" is no longer supported. Use "bars.stack" instead.');
    }

    if (!merged?.x?.field || !merged?.y?.field) {
      throw new Error('Invalid encoding: "x.field" and "y.field" are required for bar-chart.');
    }

    if (
      merged?.interactions?.tooltip !== undefined &&
      typeof merged.interactions.tooltip !== "boolean"
    ) {
      throw new Error('Invalid encoding: "interactions.tooltip" must be a boolean when provided.');
    }

    if (
      merged?.bars?.stack !== undefined &&
      merged?.bars?.stack !== true &&
      merged?.bars?.stack !== false &&
      !(typeof merged?.bars?.stack === "string" && merged.bars.stack.toLowerCase().trim() === "normalize")
    ) {
      throw new Error('Invalid encoding: "bars.stack" must be true, false, or "normalize".');
    }

    const groupField = merged?.bars?.groups?.field;
    if (
      groupField !== undefined &&
      groupField !== null &&
      (typeof groupField !== "string" || !groupField.trim())
    ) {
      throw new Error('Invalid encoding: "bars.groups.field" must be a non-empty string when provided.');
    }

    if (
      merged?.bars?.size?.field !== undefined &&
      merged?.bars?.size?.field !== null &&
      (typeof merged.bars.size.field !== "string" || !merged.bars.size.field.trim())
    ) {
      throw new Error('Invalid encoding: "bars.size.field" must be a non-empty string when provided.');
    }

    return merged;
  }

  populateDomainsFromData(encoding, rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) return encoding;
    const enc = JSON.parse(JSON.stringify(encoding || {}));

    const barColor = enc.bars?.color;
    if (barColor?.field && barColor?.scale) {
      const scaleType = barColor.scale.type || "ordinal";
      const userDomain = barColor.scale.domain;
      barColor.scale.domain = this.domainCalculator.getDomain(rows, barColor.field, userDomain, scaleType);
      enc.bars.color = barColor;
    }

    const barSize = enc.bars?.size;
    if (barSize?.field && barSize?.scale) {
      const scaleType = barSize.scale.type || "linear";
      const userDomain = barSize.scale.domain;
      barSize.scale.domain = this.domainCalculator.getDomain(rows, barSize.field, userDomain, scaleType);
      enc.bars.size = barSize;
    }

    if (enc.x?.field && enc.x?.scale) {
      const scaleType = enc.x.scale.type || "ordinal";
      const userDomain = enc.x.scale.domain;
      if (Array.isArray(userDomain) && userDomain.length > 0) {
        enc.x.scale.domain = this.domainCalculator.getDomain(rows, enc.x.field, userDomain, scaleType);
      }
    }

    if (enc.y?.field && enc.y?.scale) {
      const scaleType = enc.y.scale.type || "linear";
      const userDomain = enc.y.scale.domain;
      if (Array.isArray(userDomain) && userDomain.length > 0) {
        enc.y.scale.domain = this.domainCalculator.getDomain(rows, enc.y.field, userDomain, scaleType);
      }
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
        const thresholdScale = this._createQuantitativeThresholdScale({
          scaleConfig,
          finalDomain,
          data,
          field,
          scaleType: type,
          isColorScale: true
        });
        if (thresholdScale) return thresholdScale;
      }

      return this.colorScaleCalculator.createColorScale({
        domain: finalDomain,
        range: scaleConfig.range || null,
        scaleType: isQuant ? "quantitative" : "ordinal",
        fallbackInterpolator: null,
        label: `Color[${field}]`
      });
    }

    if (isQuant) {
      const thresholdScale = this._createQuantitativeThresholdScale({
        scaleConfig,
        finalDomain,
        data,
        field,
        scaleType: type,
        isColorScale: false
      });
      if (thresholdScale) return thresholdScale;
    }

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
