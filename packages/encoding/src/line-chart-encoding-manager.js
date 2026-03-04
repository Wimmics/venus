import * as d3 from "d3";
import { EncodingManager } from "./encoding-manager.js";

export class LineChartEncodingManager extends EncodingManager {
  getDefaultEncoding() {
    return {
      interactions: {
        tooltip: true
      },
      x: {
        field: "x",
        axis: { labelAngle: 0 },
        scale: { type: "ordinal" }
      },
      y: {
        field: "y",
        scale: { type: "linear" },
        axis: {}
      },
      lines: {
        color: {
          value: "#4e79a7",
          legend: { display: true, position: "bottom" }
        },
        size: {
          value: 2,
          legend: { display: true, position: "bottom" }
        }
      },
      points: {
        display: false,
        color: {
          value: "#4e79a7",
          legend: { display: true, position: "bottom" }
        },
        size: {
          value: 3,
          legend: { display: true, position: "bottom" }
        }
      }
    };
  }

  createAdaptiveEncoding(sparqlVars) {
    const enc = this.getDefaultEncoding();
    if (!Array.isArray(sparqlVars) || sparqlVars.length === 0) return enc;
    enc.x.field = sparqlVars[0];
    enc.y.field = sparqlVars[1] || sparqlVars[0];

    if (sparqlVars.length > 2) {
      enc.lines.color.field = sparqlVars[2];
      enc.lines.color.scale = { type: "ordinal", range: "Set3" };
      enc.lines.color.legend.display = true;
      enc.lines.color.legend.title = sparqlVars[2];
    }

    if (sparqlVars.length > 3) {
      enc.lines.size.field = sparqlVars[3];
      enc.lines.size.scale = { type: "linear", range: [1, 7] };
      enc.lines.size.legend.display = true;
      enc.lines.size.legend.title = sparqlVars[3];
    }

    return enc;
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
      lines: {
        ...this.getDefaultEncoding().lines,
        ...(userEncoding?.lines || {}),
        color: {
          ...this.getDefaultEncoding().lines.color,
          ...(userEncoding?.lines?.color || {})
        },
        size: {
          ...this.getDefaultEncoding().lines.size,
          ...(userEncoding?.lines?.size || {})
        }
      },
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
        }
      }
    };

    const hasUserPointsConfig =
      userEncoding &&
      typeof userEncoding === "object" &&
      Object.prototype.hasOwnProperty.call(userEncoding, "points") &&
      userEncoding.points &&
      typeof userEncoding.points === "object";

    if (
      hasUserPointsConfig &&
      !Object.prototype.hasOwnProperty.call(userEncoding.points, "display")
    ) {
      merged.points.display = true;
    }

    if (!merged?.x?.field || !merged?.y?.field) {
      throw new Error('Invalid encoding: "x.field" and "y.field" are required for line-chart.');
    }

    if (
      merged?.interactions?.tooltip !== undefined &&
      typeof merged.interactions.tooltip !== "boolean"
    ) {
      throw new Error('Invalid encoding: "interactions.tooltip" must be a boolean when provided.');
    }

    if (
      merged?.lines?.size?.field !== undefined &&
      merged?.lines?.size?.field !== null &&
      (typeof merged.lines.size.field !== "string" || !merged.lines.size.field.trim())
    ) {
      throw new Error('Invalid encoding: "lines.size.field" must be a non-empty string when provided.');
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

  populateDomainsFromData(encoding, rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) return encoding;
    const enc = JSON.parse(JSON.stringify(encoding || {}));

    const lineColor = enc.lines?.color;
    if (lineColor?.field && lineColor?.scale) {
      const scaleType = lineColor.scale.type || "ordinal";
      const userDomain = lineColor.scale.domain;
      lineColor.scale.domain = this.domainCalculator.getDomain(rows, lineColor.field, userDomain, scaleType);
      enc.lines.color = lineColor;
    }

    const lineSize = enc.lines?.size;
    if (lineSize?.field && lineSize?.scale) {
      const scaleType = lineSize.scale.type || "linear";
      const userDomain = lineSize.scale.domain;
      lineSize.scale.domain = this.domainCalculator.getDomain(rows, lineSize.field, userDomain, scaleType);
      enc.lines.size = lineSize;
    }

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
