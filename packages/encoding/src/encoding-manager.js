/**
 * Base EncodingManager class
 * 
 * Provides shared functionality for all visualization encodings:
 * - Scale caching
 * - Domain calculation
 * - D3 scale creation
 * 
 * Subclasses must implement:
 * - getDefaultEncoding()
 * - createAdaptiveEncoding(sparqlVars)
 * - resolveFieldMapping(mapping, vars)
 * - populateDomainsFromData(encoding, data)
 */
export class EncodingManager {
  constructor(opts = {}) {
    this.domainCalculator = opts.domainCalculator;
    this.colorScaleCalculator = opts.colorScaleCalculator;
    this.scaleCache = new Map();
    this.lastEncodingHash = null;
    this.lastDataHash = null;
  }

  /**
   * Get the default encoding template for this visualization type.
   * Must be implemented by subclasses.
   * @returns {Object} Default encoding config
   */
  getDefaultEncoding() {
    throw new Error("getDefaultEncoding must be implemented by subclass");
  }

  /**
   * Create adaptive encoding from SPARQL result variables.
   * Must be implemented by subclasses.
   * @param {string[]} sparqlVars - SPARQL variables
   * @returns {Object} Adaptive encoding config
   */
  createAdaptiveEncoding(sparqlVars) {
    throw new Error("createAdaptiveEncoding must be implemented by subclass");
  }

  /**
   * Resolve field mappings to determine link types and variable bindings.
   * Must be implemented by subclasses.
   * @param {Object} mapping - Encoding mapping config
   * @param {string[]} vars - Available SPARQL variables
   * @returns {Object} Resolved field mapping info
   */
  resolveFieldMapping(mapping, vars) {
    throw new Error("resolveFieldMapping must be implemented by subclass");
  }

  /**
   * Populate domain fields in the encoding based on provided data.
   * Must be implemented by subclasses.
   * @param {Object} encoding - Current encoding config
   * @param {Object[]} data - Data to calculate domains from
   * @returns {Object} Encoding enriched with calculated domains
   */
  populateDomainsFromData(encoding, data) {
    throw new Error("populateDomainsFromData must be implemented by subclass");
  }

  /**
   * Derive the final encoding based on user input, SPARQL variables, and defaults.
   * Handles validation, encoding selection (adaptive vs user-provided), and merging.
   * Must be implemented by subclasses.
   * @param {Object|null} userEncoding - User-provided encoding or null for adaptive
   * @param {string[]} sparqlVars - Available SPARQL variables
   * @param {Object} sparqlData - Full SPARQL result (with head.vars)
   * @returns {Object} Final derived encoding
   * @throws {Error} If encoding validation fails
   */
  deriveEncoding(userEncoding, sparqlVars, sparqlData) {
    throw new Error("deriveEncoding must be implemented by subclass");
  }

  /**
   * Check if scale cache should be invalidated based on encoding/data changes.
   * @param {Object[]} nodes - Node data
   * @param {Object} encoding - Current encoding
   * @returns {boolean} True if cache was invalidated
   */
  shouldInvalidateCache(nodes, encoding) {
    const enc = JSON.stringify(encoding);
    const dat = `nodes:${nodes.length}`;
    const changed = this.lastEncodingHash !== enc || this.lastDataHash !== dat;

    if (changed) {
      this.scaleCache.clear();
      this.lastEncodingHash = enc;
      this.lastDataHash = dat;
    }

    return changed;
  }

  /**
   * Get or create a D3 scale with caching.
   * @param {string} scaleKey - Cache key
   * @param {Object} config - Scale configuration
   * @param {Object[]} data - Data for scale domain
   * @param {string} field - Field to use for domain
   * @param {boolean} isColorScale - Whether this is a color scale
   * @param {Function} createD3ScaleFn - Function to create the D3 scale
   * @returns {Function|null} D3 scale or null
   */
  getOrCreateD3Scale(scaleKey, config, data, field, isColorScale, createD3ScaleFn) {
    this.shouldInvalidateCache(data, {});

    if (this.scaleCache.has(scaleKey)) {
      return this.scaleCache.get(scaleKey);
    }

    const scale = createD3ScaleFn(config, data, field, isColorScale);
    if (scale) {
      this.scaleCache.set(scaleKey, scale);
    }

    return scale;
  }

  /**
   * Create a D3 scale from configuration.
   * Must be implemented by subclasses that need visualization-specific scale creation.
   * @param {Object} scaleConfig - Scale configuration
   * @param {Object[]} data - Data for domain calculation
   * @param {string} field - Field name
   * @param {boolean} isColorScale - Whether this is a color scale
   * @returns {Function|null} D3 scale or null
   */
  createD3Scale(scaleConfig, data, field, isColorScale) {
    throw new Error("createD3Scale must be implemented by subclass");
  }

  /**
   * Clear scale-related caches.
   */
  clearScaleCache() {
    this.scaleCache.clear();
    this.lastEncodingHash = null;
    this.lastDataHash = null;
  }

  // ========== CLASSIFICATION FIELD DETECTION ==========

  /**
   * Enhances adaptive encoding with automatic detection of best classification fields
   * and generation of color palettes. Called after data transformation.
   * @param {Array} sparqlVars - The SPARQL variables available
   * @param {Array} nodeData - The node data to analyze
   * @param {Object} encoding - The encoding to enhance
   * @returns {Object} Enhanced encoding with detected classification field
   */
  enhanceAdaptiveEncoding(sparqlVars, nodeData, encoding) {
    if (!nodeData || nodeData.length === 0 || !sparqlVars) return encoding;

    const bestClassificationField = this.detectClassificationField(nodeData, sparqlVars);
    
    if (bestClassificationField.field !== 'type' && encoding.nodes?.color) {
      encoding.nodes.color.field = bestClassificationField.field;
    }

    return encoding;
  }

  /**
   * Detects automatically the best classification field for node coloring
   * @param {Array} data - The data (nodes or links)
   * @param {Array} sparqlVars - The SPARQL variables available
   * @returns {Object} Information about the best field found
   */
  detectClassificationField(data, sparqlVars) {
    if (!data || data.length === 0) {
      return { field: 'type', uniqueCount: 0, score: 0 };
    }

    let bestField = 'type';
    let bestScore = 0;
    let bestUniqueCount = 0;

    for (const varName of sparqlVars) {
      const analysis = this.analyzeFieldForClassification(data, varName);
      
      if (analysis.isGoodClassification) {
        if (analysis.score > bestScore) {
          bestScore = analysis.score;
          bestField = varName;
          bestUniqueCount = analysis.uniqueCount;
        }
      }
    }

    return {
      field: bestField,
      uniqueCount: bestUniqueCount,
      score: bestScore
    };
  }

  /**
   * Analyzes a field for classification suitability
   * @param {Array} data - The data to analyze
   * @param {string} fieldName - The field name to analyze
   * @returns {Object} Analysis results
   */
  analyzeFieldForClassification(data, fieldName) {
    const values = data.map(d => d[fieldName]).filter(v => v !== undefined && v !== null);
    const uniqueCount = new Set(values).size;
    const coveragePercent = (values.length / data.length) * 100;

    const isReadable = this.areValuesReadableForClassification(values);
    const isGood = uniqueCount >= 2 && uniqueCount <= data.length / 2 && coveragePercent > 80;

    // Score based on: good distribution + readability + coverage
    const score = isReadable && isGood 
      ? (uniqueCount / (data.length / 2)) * coveragePercent 
      : 0;

    return {
      isGoodClassification: isGood,
      uniqueCount,
      coveragePercent,
      isReadable,
      score
    };
  }

  /**
   * Checks if field values are readable for classification
   * @param {Array} values - The values to check
   * @returns {boolean} True if values are readable
   */
  areValuesReadableForClassification(values) {
    if (values.length === 0) return false;
    
    return values.every(v => {
      const str = String(v);
      return str.length < 100 && !str.includes('\n');
    });
  }
}
