/**
 * Force-Graph Encoding Manager
 * 
 * Handles encoding logic specific to force-directed graph visualization:
 * - Node/link field mappings
 * - Adaptive encoding from SPARQL variables
 * - Link type resolution (directional, semantic, or co-occurrence)
 * - Domain calculation for nodes and links
 * - D3 scale creation
 */
import * as d3 from "d3";
import { EncodingManager } from "./encoding-manager.js";
import { getDefaultEncodingTemplate } from "./default-encodings.js";

export class ForceGraphEncodingManager extends EncodingManager {
  /**
   * Get the default encoding template for force-graph visualization.
   * @returns {Object} Default force-graph encoding config
   */
  getDefaultEncoding() {
    return getDefaultEncodingTemplate("force-graph");
  }

  /**
   * Create adaptive encoding from SPARQL variables for force-graph.
   * Uses first two variables for directional source and target nodes.
   * @param {string[]} sparqlVars - SPARQL variables
   * @returns {Object} Adaptive encoding config
   */
  createAdaptiveEncoding(sparqlVars) {
    if (!sparqlVars?.length) return this.getDefaultEncoding();

    const enc = this.getDefaultEncoding();
    if (sparqlVars.length > 1) {
      enc.nodes.source = { ...(enc.nodes.source || {}), field: sparqlVars[0] };
      enc.nodes.target = { ...(enc.nodes.target || {}), field: sparqlVars[1] };
      enc.links.type = "directional";
    } else {
      enc.nodes.field = sparqlVars[0];
      delete enc.nodes.source;
      delete enc.nodes.target;
      enc.links.type = "cooccurrence";
      enc.links.context = { field: sparqlVars[0] };
    }

    return enc;
  }

  /**
   * Resolve field mappings for force-graph to determine link types and variable bindings.
   * Supports directional and semantic source-target links plus co-occurrence
   * links grouped by a context field.
   * @param {Object} mapping - Encoding mapping config
   * @param {string[]} vars - Available SPARQL variables
   * @returns {Object} Resolved mapping with sourceVar, targetVar, linkType
   * @throws {Error} If graph link construction has invalid variable configuration
   */
  resolveFieldMapping(mapping, vars) {
    const nodeFields = this._normalizeNodeFields(mapping?.nodes?.field);
    const sourceVar = mapping?.nodes?.source?.field;
    const targetVar = mapping?.nodes?.target?.field;
    const relationVar = mapping?.links?.relation?.field || null;
    const contextVar = mapping?.links?.context?.field || null;
    const explicitLinkType = mapping?.links?.type;
    const linkType = explicitLinkType || (
      sourceVar && targetVar
        ? (relationVar ? "semantic" : "directional")
        : "cooccurrence"
    );

    if (linkType === "cooccurrence") {
      return {
        sourceVar: nodeFields[0] || vars[0],
        targetVar: null,
        linkType,
        contextVar,
        relationVar: null
      };
    }

    return {
      sourceVar: sourceVar || vars[0],
      targetVar: targetVar || (vars.length > 1 ? vars[1] : null),
      linkType,
      contextVar: null,
      relationVar: linkType === "semantic" ? relationVar : null
    };
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
    const nodeColorKey = this.resolveNodeChannelDataKey(nodeColorEncoding);
    if (nodeColorKey && nodeColorEncoding?.scale) {
      const scaleType = nodeColorEncoding.scale.type || (nodeColorEncoding.metric ? "sequential" : "ordinal");
      const userDomain = nodeColorEncoding.scale.domain;
      nodeColorEncoding.scale.domain = this.domainCalculator.getDomain(nodes, nodeColorKey, userDomain, scaleType);
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
    const nodeSizeKey = this.resolveNodeChannelDataKey(nodeSizeEncoding);
    if (nodeSizeKey && nodeSizeEncoding?.scale) {
      const field = nodeSizeKey;
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
    this._validateGraphConstructionConfig(userEncoding);

    this._validateSingleScaleConfig(userEncoding);
    this._validateNodeMetricConfig(userEncoding);
    this._validateRoleNodeConfig(userEncoding);
    const normalizedEncoding = this._normalizeSingleScales(userEncoding);
    this._validateTooltipConfig(normalizedEncoding);

    // Merge user encoding with defaults
    const defaults = this.getDefaultEncoding();
    return {
      ...defaults,
      ...normalizedEncoding,
      interactions: {
        ...(defaults.interactions || {}),
        ...(normalizedEncoding.interactions || {})
      },
      nodes: {
        ...(defaults.nodes || {}),
        ...(normalizedEncoding.nodes || {}),
        tooltip: {
          ...(defaults.nodes?.tooltip || {}),
          ...(normalizedEncoding.nodes?.tooltip || {})
        }
      },
      links: {
        ...(defaults.links || {}),
        ...(normalizedEncoding.links || {}),
        tooltip: {
          ...(defaults.links?.tooltip || {}),
          ...(normalizedEncoding.links?.tooltip || {})
        }
      }
    };
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
    for (const role of ["source", "target"]) {
      if (Array.isArray(encoding?.nodes?.[role]?.color)) {
        throw new Error(`Invalid encoding: "nodes.${role}.color" must be an object, not an array.`);
      }
      if (Array.isArray(encoding?.nodes?.[role]?.size)) {
        throw new Error(`Invalid encoding: "nodes.${role}.size" must be an object, not an array.`);
      }
    }
    if (Array.isArray(encoding?.links?.color)) {
      throw new Error('Invalid encoding: "links.color" must be an object, not an array.');
    }
  }

  _validateNodeMetricConfig(encoding) {
    const validateMetric = (channel, key) => {
      if (channel?.metric === undefined) return;
      if (channel.metric !== "degree") {
        throw new Error(`Invalid encoding: "${key}.metric" must be "degree" when provided.`);
      }
      if (channel.field !== undefined) {
        throw new Error(`Invalid encoding: "${key}" cannot define both "field" and "metric".`);
      }
    };

    validateMetric(encoding?.nodes?.color, "nodes.color");
    validateMetric(encoding?.nodes?.size, "nodes.size");
    validateMetric(encoding?.nodes?.source?.color, "nodes.source.color");
    validateMetric(encoding?.nodes?.target?.color, "nodes.target.color");
    validateMetric(encoding?.nodes?.source?.size, "nodes.source.size");
    validateMetric(encoding?.nodes?.target?.size, "nodes.target.size");

    const metricColorScaleType = encoding?.nodes?.color?.scale?.type;
    if (
      encoding?.nodes?.color?.metric !== undefined &&
      metricColorScaleType !== undefined &&
      metricColorScaleType !== "quantitative" &&
      metricColorScaleType !== "sequential"
    ) {
      throw new Error(
        'Invalid encoding: "nodes.color.scale.type" must be "quantitative" or "sequential" for metric color.'
      );
    }

    if (encoding?.links?.color?.metric !== undefined) {
      throw new Error('Invalid encoding: "links.color.metric" is not supported.');
    }
  }

  _validateGraphConstructionConfig(encoding) {
    if (encoding?.links?.field !== undefined) {
      throw new Error(
        'Invalid encoding: "links.field" is no longer supported. Use "nodes.source.field" and "nodes.target.field", "links.relation.field", or "links.context.field".'
      );
    }
    const linkType = encoding?.links?.type;
    if (linkType && !["directional", "semantic", "cooccurrence"].includes(linkType)) {
      throw new Error('Invalid encoding: "links.type" must be "directional", "semantic", or "cooccurrence".');
    }
    if (linkType === "cooccurrence") {
      if (!encoding?.nodes?.field) {
        throw new Error('Invalid encoding: "nodes.field" is required for co-occurrence graph nodes.');
      }
      if (typeof encoding?.links?.context?.field !== "string" || !encoding.links.context.field.trim()) {
        throw new Error('Invalid encoding: "links.context.field" is required for co-occurrence links.');
      }
      return;
    }
    if (encoding?.links?.context !== undefined && linkType !== "cooccurrence") {
      throw new Error('Invalid encoding: "links.context" is only supported for co-occurrence links.');
    }
    if (!encoding?.nodes?.source?.field || !encoding?.nodes?.target?.field) {
      throw new Error(
        'Invalid encoding: "nodes.source.field" and "nodes.target.field" are required for directional and semantic graph links.'
      );
    }
    if ((linkType === "semantic" || encoding?.links?.relation !== undefined) && (
      typeof encoding?.links?.relation?.field !== "string" ||
      !encoding.links.relation.field.trim()
    )) {
      throw new Error('Invalid encoding: "links.relation.field" is required for semantic links.');
    }
  }

  _validateRoleNodeConfig(encoding) {
    const validateRole = (role) => {
      const config = encoding?.nodes?.[role];
      if (!config) return;
      const supportedKeys = new Set(["field", "color", "size", "label", "tooltip"]);
      const unsupportedKeys = Object.keys(config).filter((key) => !supportedKeys.has(key));
      if (unsupportedKeys.length) {
        throw new Error(`Invalid encoding: "nodes.${role}" has unsupported properties: ${unsupportedKeys.join(", ")}.`);
      }
    };

    validateRole("source");
    validateRole("target");
  }

  resolveNodeChannelDataKey(channelEncoding) {
    if (typeof channelEncoding?.field === "string" && channelEncoding.field.trim()) {
      return channelEncoding.field;
    }
    if (channelEncoding?.metric === "degree") {
      return "degree";
    }
    return null;
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

    validateFields(encoding?.nodes?.tooltip?.fields, "nodes.tooltip.fields");
    validateFields(encoding?.nodes?.source?.tooltip?.fields, "nodes.source.tooltip.fields");
    validateFields(encoding?.nodes?.target?.tooltip?.fields, "nodes.target.tooltip.fields");
    validateFields(encoding?.links?.tooltip?.fields, "links.tooltip.fields");
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
    // Force-graph scales can be fed by nodes or links; accept any data container here.
    const finalDomain = this._resolveScaleDomain(scaleConfig, data, field, type);
    if (!finalDomain?.length) return null;

    const range = scaleConfig.range || null;
    const isQuant = this._isQuantitativeScaleType(type);

    try {
      if (isQuant) {
        const thresholdScale = this._createQuantitativeThresholdScale({
          scaleConfig,
          finalDomain,
          data,
          field,
          scaleType: type,
          isColorScale
        });
        if (thresholdScale) return thresholdScale;
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

      // Size ranges are visualization-specific and normalized through sizeRangeCalculator.
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
      // Force graph is interaction-heavy; fail soft and let caller skip invalid scales.
      return null;
    }
  }

}
