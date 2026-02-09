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

    let sourceVar = vars[0];
    let targetVar = vars.length > 1 ? vars[1] : null;
    let linkType = "directional";

    // Override source from explicit nodes.field if provided
    if (mapping.nodes?.field?.length) {
      sourceVar = mapping.nodes.field[0];
    }

    // Determine link type from linkField configuration
    if (linkField) {
      if (typeof linkField === "string") {
        // String linkField indicates semantic link using that variable
        if (vars.includes(linkField)) {
          linkType = "semantic";

          if (mapping.nodes?.field?.length >= 2) {
            // Two node variables for bidirectional semantic link
            sourceVar = mapping.nodes.field[0];
            targetVar = mapping.nodes.field[1];
          } else if (mapping.nodes?.field?.length === 1) {
            // Single node variable for co-occurrence semantic link
            sourceVar = mapping.nodes.field[0];
            targetVar = null; // co-occurrence mode handled by mapper
          } else {
            throw new Error(
              "For semantic links, at least 1 variable is required in nodes.field"
            );
          }
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

    // Nodes color domain(s)
    const nodeColorEncodings = Array.isArray(enc.nodes?.color) ? enc.nodes.color : [enc.nodes?.color].filter(Boolean);
    for (const colorEncoding of nodeColorEncodings) {
      if (!colorEncoding?.field || !colorEncoding?.scale) continue;
      const scaleType = colorEncoding.scale.type || "ordinal";
      const userDomain = colorEncoding.scale.domain;
      colorEncoding.scale.domain = this.domainCalculator.getDomain(nodes, colorEncoding.field, userDomain, scaleType);
    }
    if (Array.isArray(enc.nodes?.color)) {
      enc.nodes.color = nodeColorEncodings;
    } else if (nodeColorEncodings[0]) {
      enc.nodes.color = nodeColorEncodings[0];
    }

    // Links color domain(s)
    if (linkData.length) {
      const linkColorEncodings = Array.isArray(enc.links?.color) ? enc.links.color : [enc.links?.color].filter(Boolean);
      for (const colorEncoding of linkColorEncodings) {
        if (!colorEncoding?.field || !colorEncoding?.scale) continue;
        const scaleType = colorEncoding.scale.type || "ordinal";
        const userDomain = colorEncoding.scale.domain;
        colorEncoding.scale.domain = this.domainCalculator.getDomain(linkData, colorEncoding.field, userDomain, scaleType);
      }
      if (Array.isArray(enc.links?.color)) {
        enc.links.color = linkColorEncodings;
      } else if (linkColorEncodings[0]) {
        enc.links.color = linkColorEncodings[0];
      }
    }

    // Nodes size domain
    if (enc.nodes?.size?.field && enc.nodes?.size?.scale) {
      const f = enc.nodes.size.field;
      const scaleType = enc.nodes.size.scale.type || "linear";
      const userDomain = enc.nodes.size.scale.domain;
      enc.nodes.size.scale.domain = this.domainCalculator.getDomain(nodes, f, userDomain, scaleType);
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
      throw new Error('Invalid encoding: "nodes.field" is required (array with at least one SPARQL variable).');
    }

    // Merge user encoding with defaults
    return { ...this.getDefaultEncoding(), ...userEncoding };
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

      const finalRange = range || [5, 20];

      if (type === "linear") return d3.scaleLinear().domain(finalDomain).range(finalRange);
      if (type === "sqrt") return d3.scaleSqrt().domain(finalDomain).range(finalRange);
      if (type === "log") return d3.scaleLog().domain(finalDomain).range(finalRange);

      return d3.scaleOrdinal().domain(finalDomain).range(finalRange);
    } catch {
      return null;
    }
  }
}
