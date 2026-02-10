/**
 * Force-Graph Encoding Manager
 * 
 * Handles encoding logic specific to force-directed graph visualization:
 * - Node/link field mappings
 * - Adaptive encoding from SPARQL variables
 * - Link type resolution (directional vs semantic)
 * - Domain calculation for nodes and links
 * - D3 scale creation
 */
import * as d3 from "d3";
import { EncodingManager } from "./encoding-manager.js";

export class ForceGraphEncodingManager extends EncodingManager {
  /**
   * Get the default encoding template for force-graph visualization.
   * @returns {Object} Default force-graph encoding config
   */
  getDefaultEncoding() {
    return {
      description: "Default force-graph encoding",
      width: 800,
      height: 600,
      autosize: "none",
      nodes: {
        field: ["source"],
        labels: {
          display: true
        },
        stroke: {
          value: "#ffffff",
          width: 1.5,
          display: true
        },
        color: {
          field: "type",
          scale: {
            type: "ordinal",
            domain: ["uri", "literal"],
            range: ["#69b3a2", "#ff7f0e"]
          },
          legend: { display: true, title: "Node Types" }
        },
        size: {
          field: "links",
          scale: { type: "linear", domain: [0, 10], range: [8, 25] },
          legend: { display: false, title: "Node Size" }
        }
      },
      links: {
        field: { source: "source", target: "target" },
        distance: 100,
        width: { value: 1.5 },
        color: { value: "#999" }
      }
    };
  }

  /**
   * Create adaptive encoding from SPARQL variables for force-graph.
   * Uses first variable for nodes, first two for directional links.
   * Automatically detects best classification field for node coloring.
   * @param {string[]} sparqlVars - SPARQL variables
   * @param {Object[]} nodeData - Optional node data for enhanced field detection
   * @returns {Object} Adaptive encoding config (enhanced if nodeData provided)
   */
  createAdaptiveEncoding(sparqlVars, nodeData = null) {
    if (!sparqlVars?.length) return this.getDefaultEncoding();

    const enc = this.getDefaultEncoding();
    enc.nodes.field = [sparqlVars[0]];

    if (sparqlVars.length > 1) {
      enc.links.field = { source: sparqlVars[0], target: sparqlVars[1] };
    } else {
      enc.links.field = sparqlVars[0];
    }

    // Enhance with automatic field detection if node data provided
    if (nodeData && nodeData.length > 0) {
      return this.enhanceAdaptiveEncoding(sparqlVars, nodeData, enc);
    }

    return enc;
  }

  /**
   * Resolve field mappings for force-graph to determine link types and variable bindings.
   * Supports:
   * - Directional links: source -> target
   * - Semantic links: source <-> target (via a link variable)
   * - Co-occurrence: single variable mode
   * @param {Object} mapping - Encoding mapping config
   * @param {string[]} vars - Available SPARQL variables
   * @returns {Object} Resolved mapping with sourceVar, targetVar, linkType
   * @throws {Error} If semantic links have invalid variable configuration
   */
  resolveFieldMapping(mapping, vars) {
    const linkField = mapping.links?.field;
    const nodeFields = this._normalizeNodeFields(mapping?.nodes?.field);

    let sourceVar = vars[0];
    let targetVar = vars.length > 1 ? vars[1] : null;
    let linkType = "directional";

    // Override source from explicit nodes.field if provided
    if (nodeFields.length) {
      sourceVar = nodeFields[0];
    }

    // Determine link type from linkField configuration
    if (linkField) {
      if (typeof linkField === "string") {
        // String linkField always indicates co-occurrence based on that variable's values
        if (vars.includes(linkField)) {
          linkType = "semantic";
          sourceVar = nodeFields.length ? nodeFields[0] : vars[0];
          targetVar = null; // co-occurrence mode handled by mapper
        }
      } else if (typeof linkField === "object" && linkField) {
        // Object linkField with explicit source/target
        if (
          linkField.source &&
          linkField.target &&
          vars.includes(linkField.source) &&
          vars.includes(linkField.target)
        ) {
          sourceVar = linkField.source;
          targetVar = linkField.target;
          linkType = "directional";
        }
      }
    }

    return { sourceVar, targetVar, linkType };
  }

  /**
   * Populate domain fields in the encoding based on node data.
   * Calculates domains for node color and size fields.
   * @param {Object} encoding - Current encoding config
   * @param {Object[]} nodes - Node data to calculate domains from
   * @returns {Object} Encoding enriched with calculated domains
   */
  populateDomainsFromData(encoding, nodes, links = null) {
    if (!nodes?.length) return encoding;

    const enc = JSON.parse(JSON.stringify(encoding));
    const linkData = Array.isArray(links) ? links : [];

    // Nodes color domain (single config)
    const nodeColorEncoding = Array.isArray(enc.nodes?.color) ? enc.nodes.color[0] : enc.nodes?.color;
    if (nodeColorEncoding?.field && nodeColorEncoding?.scale) {
      const scaleType = nodeColorEncoding.scale.type || "ordinal";
      const userDomain = nodeColorEncoding.scale.domain;
      nodeColorEncoding.scale.domain = this.domainCalculator.getDomain(nodes, nodeColorEncoding.field, userDomain, scaleType);
      enc.nodes.color = nodeColorEncoding;
    }

    // Links color domain (single config)
    if (linkData.length) {
      const linkColorEncoding = Array.isArray(enc.links?.color) ? enc.links.color[0] : enc.links?.color;
      if (linkColorEncoding?.field && linkColorEncoding?.scale) {
        const scaleType = linkColorEncoding.scale.type || "ordinal";
        const userDomain = linkColorEncoding.scale.domain;
        linkColorEncoding.scale.domain = this.domainCalculator.getDomain(linkData, linkColorEncoding.field, userDomain, scaleType);
        enc.links.color = linkColorEncoding;
      }
    }

    // Nodes size domain (single config)
    const nodeSizeEncoding = Array.isArray(enc.nodes?.size) ? enc.nodes.size[0] : enc.nodes?.size;
    if (nodeSizeEncoding?.field && nodeSizeEncoding?.scale) {
      const field = nodeSizeEncoding.field;
      const scaleType = nodeSizeEncoding.scale.type || "linear";
      const userDomain = nodeSizeEncoding.scale.domain;
      const userRange = nodeSizeEncoding.scale.range;
      nodeSizeEncoding.scale.domain = this.domainCalculator.getDomain(nodes, field, userDomain, scaleType);
      if (this.sizeRangeCalculator) {
        nodeSizeEncoding.scale.range = this.sizeRangeCalculator.createSizeRange({
          data: nodes,
          field,
          scaleType,
          range: userRange,
          label: `Size[${field}]`
        });
      }
      enc.nodes.size = nodeSizeEncoding;
    }

    return enc;
  }

  /**
   * Resolve the final encoding based on user input, SPARQL variables, and defaults.
   * Validates encoding, selects between adaptive and user-provided, and merges with defaults.
   * @param {Object|null} userEncoding - User-provided encoding or null for adaptive
   * @param {string[]} sparqlVars - Available SPARQL variables
   * @param {Object} sparqlData - Full SPARQL result (with head.vars)
   * @returns {Object} Resolved final encoding
   * @throws {Error} If encoding validation fails
   */
  deriveEncoding(userEncoding, sparqlVars, sparqlData) {
    if (userEncoding === null) {
      // Adaptive encoding mode
      const vars = sparqlVars || sparqlData?.head?.vars || [];
      return vars.length ? this.createAdaptiveEncoding(vars) : this.getDefaultEncoding();
    }

    // User-provided encoding validation
    if (!userEncoding?.nodes?.field) {
      throw new Error('Invalid encoding: "nodes.field" is required (string or array with at least one SPARQL variable).');
    }

    this._validateSingleScaleConfig(userEncoding);
    const normalizedEncoding = this._normalizeSingleScales(userEncoding);

    // Merge user encoding with defaults
    return { ...this.getDefaultEncoding(), ...normalizedEncoding };
  }

  _normalizeSingleScales(encoding) {
    return JSON.parse(JSON.stringify(encoding || {}));
  }

  _normalizeNodeFields(fieldConfig) {
    if (Array.isArray(fieldConfig)) {
      return fieldConfig.filter((value) => typeof value === "string" && value.trim());
    }
    if (typeof fieldConfig === "string" && fieldConfig.trim()) {
      return [fieldConfig];
    }
    return [];
  }

  _validateSingleScaleConfig(encoding) {
    if (Array.isArray(encoding?.nodes?.color)) {
      throw new Error('Invalid encoding: "nodes.color" must be an object, not an array.');
    }
    if (Array.isArray(encoding?.nodes?.size)) {
      throw new Error('Invalid encoding: "nodes.size" must be an object, not an array.');
    }
    if (Array.isArray(encoding?.links?.color)) {
      throw new Error('Invalid encoding: "links.color" must be an object, not an array.');
    }
  }

  /**
   * Create a D3 scale from configuration.
   * Supports linear, sqrt, log, and ordinal D3 scales, as well as color scales.
   * @param {Object} scaleConfig - Scale configuration
   * @param {Object[]} data - Data for domain calculation
   * @param {string} field - Field name
   * @param {boolean} isColorScale - Whether this is a color scale
   * @returns {Function|null} D3 scale or null
   */
  createD3Scale(scaleConfig, data, field, isColorScale) {
    

    if (!scaleConfig) return null;

    const type = scaleConfig.type || "ordinal";

    let finalDomain;
    if (data && field && this.domainCalculator) {
      const userDomain = scaleConfig.domain;
      finalDomain = this.domainCalculator.getDomain(data, field, userDomain, type);
      if (!finalDomain?.length) return null;
    } else if (Array.isArray(scaleConfig.domain) && scaleConfig.domain.length) {
      finalDomain = scaleConfig.domain;
    } else {
      return null;
    }

    const range = scaleConfig.range || null;
    const isQuant =
      type === "linear" || type === "sqrt" || type === "log" || type === "quantitative" || type === "sequential";

    try {
      if (isQuant) {
        const binningOptions = this._resolveBinningOptions(scaleConfig);
        const numericValues = (Array.isArray(data) ? data : [])
          .map((item) => this.domainCalculator.convertToNumber(item?.[field]))
          .filter((value) => !isNaN(value));

        if (binningOptions.enabled && numericValues.length > 1 && this.binBreaksCalculator) {
          const domainMin = Number(finalDomain[0]);
          const domainMax = Number(finalDomain[finalDomain.length - 1]);
          const effectiveMin = Number.isFinite(binningOptions.min) ? binningOptions.min : (Number.isFinite(domainMin) ? domainMin : null);
          const effectiveMax = Number.isFinite(binningOptions.max) ? binningOptions.max : (Number.isFinite(domainMax) ? domainMax : null);
          const breaks = this.binBreaksCalculator.computeBreaks(numericValues, {
            method: binningOptions.method,
            bins: binningOptions.bins,
            breaks: binningOptions.breaks,
            min: effectiveMin,
            max: effectiveMax,
            label: `${isColorScale ? "Color" : "Size"}[${field}]`,
            quantitative: true
          });

          const binCount = breaks.bins;
          if (binCount > 1 && isColorScale) {
            const thresholdColors = this._buildThresholdColorRange(range, binCount, field);
            const thresholdScale = d3.scaleThreshold().domain(breaks.thresholds).range(thresholdColors);
            thresholdScale.__kgnovisBounds = { min: breaks.min, max: breaks.max };
            return thresholdScale;
          }

          if (binCount > 1) {
            const thresholdSizes = this._buildThresholdSizeRange(range, binCount, data, field, type);
            const thresholdScale = d3.scaleThreshold().domain(breaks.thresholds).range(thresholdSizes);
            thresholdScale.__kgnovisBounds = { min: breaks.min, max: breaks.max };
            return thresholdScale;
          }
        }
      }

      if (isColorScale) {
        const scaleType = isQuant ? "quantitative" : "ordinal";
        return this.colorScaleCalculator.createColorScale({
          domain: finalDomain,
          range,
          scaleType,
          fallbackInterpolator: null,
          label: `Color[${field}]`
        });
      }

      const finalRange = this.sizeRangeCalculator
        ? this.sizeRangeCalculator.createSizeRange({
            data,
            field,
            scaleType: type,
            range,
            label: `Size[${field}]`
          })
        : (range || [5, 20]);

      if (type === "linear") return d3.scaleLinear().domain(finalDomain).range(finalRange);
      if (type === "sqrt") return d3.scaleSqrt().domain(finalDomain).range(finalRange);
      if (type === "log") return d3.scaleLog().domain(finalDomain).range(finalRange);

      return d3.scaleOrdinal().domain(finalDomain).range(finalRange);
    } catch {
      return null;
    }
  }

  _resolveBinningOptions(scaleConfig) {
    const raw = scaleConfig?.binning;
    if (raw === false) {
      return { enabled: false, method: "jenks", bins: 1, breaks: null, min: null, max: null };
    }

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
    return Array.from({ length: binCount }, (_, index) => palette[index % palette.length] || fallback[index % fallback.length] || "#999");
  }

  _buildThresholdSizeRange(range, binCount, data, field, scaleType) {
    const normalized = this.sizeRangeCalculator
      ? this.sizeRangeCalculator.createSizeRange({
          data,
          field,
          scaleType,
          range,
          label: `Size[${field}]`
        })
      : (range || [5, 20]);

    if (!Array.isArray(normalized) || normalized.length === 0) {
      return Array.from({ length: binCount }, () => 10);
    }

    if (normalized.length >= binCount) {
      return normalized.slice(0, binCount);
    }

    const start = Number(normalized[0]);
    const end = Number(normalized[normalized.length - 1]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || binCount <= 1) {
      return Array.from({ length: binCount }, () => 10);
    }

    return Array.from({ length: binCount }, (_, index) => {
      const ratio = binCount === 1 ? 0 : index / (binCount - 1);
      return start + (end - start) * ratio;
    });
  }
}
