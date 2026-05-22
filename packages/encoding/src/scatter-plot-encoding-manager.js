import * as d3 from "d3";
import { EncodingManager } from "./encoding-manager.js";
import { getDefaultEncodingTemplate } from "./default-encodings.js";

export class ScatterPlotEncodingManager extends EncodingManager {
  getDefaultEncoding() {
    return getDefaultEncodingTemplate("scatter-plot");
  }

  createAdaptiveEncoding(sparqlVars) {
    const enc = this.getDefaultEncoding();
    if (!Array.isArray(sparqlVars) || sparqlVars.length === 0) return enc;
    enc.x.field = sparqlVars[0];
    enc.y.field = sparqlVars[1] || sparqlVars[0];

    if (sparqlVars.length > 3) {
      enc.points.size.field = sparqlVars[3];
      enc.points.size.scale = { type: "linear", range: [2, 10] };
      enc.points.size.legend.display = true;
      enc.points.size.legend.title = sparqlVars[3];
    }

    return enc;
  }

  deriveEncoding(userEncoding, sparqlVars, sparqlData) {
    if (userEncoding === null) {
      const vars = sparqlVars || sparqlData?.head?.vars || [];
      return this.createAdaptiveEncoding(vars);
    }

    this._rejectLegacyMarkLabels(userEncoding, ["points"]);
    this._validateTooltipConfig(userEncoding)

    const merged = {
      ...this.getDefaultEncoding(),
      ...(userEncoding || {}),
      interactions: {
        ...this.getDefaultEncoding().interactions,
        ...(userEncoding?.interactions || {})
      },
      x: { ...this.getDefaultEncoding().x, ...(userEncoding?.x || {}) },
      y: { ...this.getDefaultEncoding().y, ...(userEncoding?.y || {}) },
      points: {
        ...this.getDefaultEncoding().points,
        ...(userEncoding?.points || {}),
        color: {
          ...this.getDefaultEncoding().points.color,
          ...(userEncoding?.points?.color || {})
        },
        size: {
          ...this.getDefaultEncoding().points.size,
          ...(userEncoding?.points?.size || {})
        },
        tooltip: {
          ...this.getDefaultEncoding().points.tooltip,
          ...(userEncoding?.points?.tooltip || {})
        }
      }
    };

    if (!merged?.x?.field || !merged?.y?.field) {
      throw new Error('Invalid encoding: "x.field" and "y.field" are required for scatter-plot.');
    }

    if (
      merged?.interactions?.tooltip !== undefined &&
      typeof merged.interactions.tooltip !== "boolean"
    ) {
      throw new Error('Invalid encoding: "interactions.tooltip" must be a boolean when provided.');
    }

    if (
      merged?.points?.display !== undefined &&
      typeof merged.points.display !== "boolean"
    ) {
      throw new Error('Invalid encoding: "points.display" must be a boolean when provided.');
    }

    if (
      merged?.points?.size?.field !== undefined &&
      merged?.points?.size?.field !== null &&
      (typeof merged.points.size.field !== "string" || !merged.points.size.field.trim())
    ) {
      throw new Error('Invalid encoding: "points.size.field" must be a non-empty string when provided.');
    }

    return merged;
  }

  _validateTooltipConfig(encoding) {
    const enabled = encoding?.interactions?.tooltip;
    if (enabled !== undefined && typeof enabled !== "boolean") {
      throw new Error('Invalid encoding: "interactions.tooltip" must be a boolean when provided.');
    }

    const validateFields = (fields, key) => {
      if (fields == null) return;
      if (!Array.isArray(fields)) {
        throw new Error(`Invalid encoding: "${key}" must be an array of query variable names.`);
      }
      const allStrings = fields.every((fieldName) => typeof fieldName === "string" && fieldName.trim().length > 0);
      if (!allStrings) {
        throw new Error(`Invalid encoding: "${key}" must contain non-empty strings only.`);
      }
    };

    validateFields(encoding?.points?.tooltip?.fields, "points.tooltip.fields");
  }

  populateDomainsFromData(encoding, rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) return encoding;
    const enc = JSON.parse(JSON.stringify(encoding || {}));

    if (enc.points?.color?.field && enc.points?.color?.scale) {
      const scaleType = enc.points.color.scale.type || "ordinal";
      const userDomain = enc.points.color.scale.domain;
      enc.points.color.scale.domain = this.domainCalculator.getDomain(
        rows,
        enc.points.color.field,
        userDomain,
        scaleType
      );
    }

    if (enc.points?.size?.field && enc.points?.size?.scale) {
      const scaleType = enc.points.size.scale.type || "linear";
      const userDomain = enc.points.size.scale.domain;
      enc.points.size.scale.domain = this.domainCalculator.getDomain(
        rows,
        enc.points.size.field,
        userDomain,
        scaleType
      );
    }

    if (enc.x?.field && enc.x?.scale) {
      const scaleType = enc.x.scale.type || "linear";
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
    const isQuant = this._isQuantitativeScaleType(type, ["pow", "count"]);
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
