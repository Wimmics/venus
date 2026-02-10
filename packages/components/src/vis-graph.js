/**
 * Web component for force-directed knowledge graph visualization.
 *
 * Responsibilities:
 * - Render a graph (D3 force simulation) from SPARQL JSON or manual nodes/links
 * - Manage visual encoding and legends
 * - Emit node selection / details requests
 *
 * Non-responsibilities:
 * - No node-details panel UI
 * - No metadata fetching
 *
 * Composition:
 * - A node-details component can be "provided" to VisGraph via the `nodeDetailsPanel` property
 *   (any element with a compatible API: { open, node, endpoint, proxy })
 * - VisGraph will drive it (set props) when the user requests details.
 */
import { ForceGraphRenderer } from "@wimmics/kgnovis-d3renderer";
import { SparqlDataFetcher } from "@wimmics/kgnovis-sparql";
import { createEncodingManager } from "@wimmics/kgnovis-encoding";
import { createSparqlMapper, listSparqlMappers } from "@wimmics/kgnovis-mappers";
import { createLogger } from "@wimmics/kgnovis-core";
import { buildForceGraph } from "@wimmics/kgnovis-datasource";
import { createLegends, positionLegends } from "@wimmics/kgnovis-legends";

export class VisGraph extends HTMLElement {
  static get observedAttributes() {
    return ["width", "height", "endpoint", "proxy-url"];
  }

  // ========== CONSTRUCTOR & LIFECYCLE ==========

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.logger = createLogger("VisGraph", { debug: false });

    this.nodes = [];
    this.links = [];
    this.width = 800;
    this.height = 600;

    this.selectedNode = null;

    // SPARQL
    this.sparqlFetcher = new SparqlDataFetcher();
    this.currentEndpoint = null;
    this.currentProxyUrl = null;
    this.sparqlData = null;

    // Mapper
    this.logger.debug("Available mappers", { mappers: listSparqlMappers?.() });
    this.mapper = createSparqlMapper("force-graph");

    // Encoding
    this.encodingManager = createEncodingManager('force-graph');

    this.scaleCache = new Map();

    // Public-ish internal state
    this.internalData = new WeakMap();
    this.internalData.set(this, {});
    this.visualEncoding = this.encodingManager.getDefaultEncoding();

    // UI timers
    this.tooltipTimeout = null;

    // Composition: externally provided node-details panel element
    this._nodeDetailsPanel = null;
    this.renderer = null;

    // Legend management: component owns and manages its legends
    this._legends = [];

    // Build DOM structure once
    this._initDOMStructure();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "width") {
      this.width = parseInt(newValue, 10) || 800;
      this.render();
    } else if (name === "height") {
      this.height = parseInt(newValue, 10) || 600;
      this.render();
    } else if (name === "endpoint") {
      this.currentEndpoint = newValue || null;
    } else if (name === "proxy-url") {
      this.currentProxyUrl = newValue || null;
    }
  }

  connectedCallback() {
    this.render();
  }

  // ========== PUBLIC API & PROPERTIES ==========

  /**
   * Provide a node-details panel element.
   * The element is not created/owned by VisGraph.
   *
   * Expected panel API (duck-typed):
   * - panel.open (boolean or attribute)
   * - panel.node = node
   * - panel.endpoint = string
   * - panel.proxy = string|null
   */
  set nodeDetailsPanel(el) {
    this._nodeDetailsPanel = el || null;
  }
  get nodeDetailsPanel() {
    return this._nodeDetailsPanel;
  }

  set sparqlQuery(query) {
    const data = this.internalData.get(this) || {};
    data.sparqlQuery = query;
    this.internalData.set(this, data);
  }
  get sparqlQuery() {
    return this.internalData.get(this)?.sparqlQuery;
  }

  set sparqlEndpoint(endpoint) {
    const data = this.internalData.get(this) || {};
    data.sparqlEndpoint = endpoint;
    this.internalData.set(this, data);
  }
  get sparqlEndpoint() {
    return this.internalData.get(this)?.sparqlEndpoint;
  }

  set sparqlResult(jsonData) {
    const data = this.internalData.get(this) || {};
    data.sparqlResult = jsonData;
    this.internalData.set(this, data);
  }
  get sparqlResult() {
    return this.internalData.get(this)?.sparqlResult;
  }

  set encoding(mapping) {
    const data = this.internalData.get(this) || {};
    data.encoding = mapping;
    this.internalData.set(this, data);
    this.setEncoding(mapping);
  }
  get encoding() {
    return this.internalData.get(this)?.encoding;
  }

  set proxy(url) {
    const data = this.internalData.get(this) || {};
    data.proxy = url;
    this.internalData.set(this, data);
  }
  get proxy() {
    return this.internalData.get(this)?.proxy;
  }

  getEncoding() {
    return JSON.parse(JSON.stringify(this.visualEncoding));
  }

  // ========== DATA LOADING ==========

  /**
   * Load and render a graph from SPARQL endpoint/query or pre-fetched data.
   */
  async launch() {
    const result = await buildForceGraph({
      endpoint: this.sparqlEndpoint,
      query: this.sparqlQuery,
      jsonData: this.sparqlResult,
      proxyUrl: this.proxy,
      encoding: this.visualEncoding,
      encodingManager: this.encodingManager
    });

    if (result.status !== "success") {
      this._notify(result.message || "Failed to build force graph", "error");
      this.logger.error("buildForceGraph failed", result);
      return;
    }

    const { graph, meta } = result;
    this.nodes = graph.nodes;
    this.links = graph.links;
    this.sparqlData = result.raw;

    if (meta?.encodingUsed) {
      this.visualEncoding = meta.encodingUsed;
      this._populateDomains();
    } else if (meta?.usedAdaptiveEncoding) {
      this.visualEncoding = this.encodingManager.createAdaptiveEncoding(meta.vars, this.nodes);
      this._populateDomains();
    }

    this.render();
  }

  /**
   * Request showing details for a node.
   * VisGraph does not fetch metadata and does not render the panel;
   * it only drives the provided panel and emits an event.
   */
  requestNodeDetails(node) {
    if (!node?.uri) {
      this._notify("This node has no associated URI", "error");
      this.logger.warn("requestNodeDetails called without node.uri", { node });
      return;
    }

    const endpoint = this._resolveEndpoint();
    const proxyUrl = this._resolveProxyUrl();

    // Emit event for external composition (preferred pattern)
    this.dispatchEvent(
      new CustomEvent("nodeDetailsRequested", {
        detail: { node, endpoint, proxyUrl },
        bubbles: true,
        composed: true
      })
    );

    // If a panel is provided, drive it.
    const panel = this._nodeDetailsPanel;
    if (panel) {
      try {
        panel.endpoint = endpoint;
        panel.proxy = proxyUrl;
        panel.node = node;
        panel.open = true;
      } catch (e) {
        this.logger.warn("Failed to drive nodeDetailsPanel", { message: e?.message });
      }
    }
  }

  // ========== ENCODING & VISUALIZATION CONFIG ==========

  /**
   * Set or update the visual encoding (colors, sizes, link types, etc.).
   */
  setEncoding(encoding) {
    try {
      this.visualEncoding = this.encodingManager.deriveEncoding(encoding, this.sparqlData?.head?.vars, this.sparqlData);
    } catch (e) {
      this._notify(e.message, "error");
      return;
    }

    if (this.nodes?.length) {
      this._populateDomains();
    }
    this.render();
  }

  // ========== RENDERING ==========
  /**
   * Update the visualization with current nodes, links, and encoding.
   * The DOM structure is built once; this just updates the renderer.
   */
  render() {
    const container = this.shadowRoot?.querySelector(".graph-container");
    if (container) {
      container.style.background = this._resolveBackgroundColor();
    }

    if (this.renderer) {
      this.renderer.render({ nodes: this.nodes, links: this.links }, this.visualEncoding);
      this._manageLegends();
    }
  }

  // ========== PRIVATE: LEGENDS ==========

  /**
   * Manages legend lifecycle: creates/updates legends based on current encoding
   * This method is called on each render to keep legends in sync with data/encoding
   */
  _manageLegends() {
    if (!this.nodes?.length) return;
    const container = this.shadowRoot.querySelector('.graph-container');
    if (!container) return;

    // Clean up old legends
    this._legends.forEach(legend => legend.remove());
    this._legends = [];

    // Create new legends based on current encoding
    const legendConfig = {
      colorEncoding: this.visualEncoding.nodes?.color,
      sizeEncoding: this.visualEncoding.nodes?.size,
      data: this.nodes,
      getD3Scale: (scaleKey) => {
        // Map legend scale keys to renderer scale keys for consistency
        if (scaleKey.startsWith('node-color-')) {
          const [, , index, ...fieldParts] = scaleKey.split('-');
          const field = fieldParts.join('-');
          const colorEncodings = Array.isArray(this.visualEncoding.nodes?.color)
            ? this.visualEncoding.nodes.color
            : [this.visualEncoding.nodes?.color].filter(Boolean);
          const colorEncoding = colorEncodings[Number(index)] || colorEncodings.find((c) => c?.field === field);
          if (!colorEncoding?.scale || !colorEncoding?.field) return null;
          return this._getOrCreateScale(`nodeColor-${index}-${colorEncoding.field}`, colorEncoding.scale, this.nodes, colorEncoding.field, true);
        } else if (scaleKey.startsWith('node-size-')) {
          const field = scaleKey.replace('node-size-', '');
          return this._getOrCreateScale(`nodeSize-${field}`, this.visualEncoding.nodes?.size?.scale, this.nodes, field, false);
        }
        return null;
      }
    };

    const newLegends = createLegends(legendConfig);
    
    // Position and append legends
    positionLegends(container, newLegends, {
      position: 'bottom-left',
      spacing: 20,
      gap: 270
    });

    newLegends.forEach(legend => {
      container.appendChild(legend);
      this._legends.push(legend);
    });
  }

  /**
   * Cleanup legends (called on component destroy)
   */
  _destroyLegends() {
    this._legends.forEach(legend => legend.remove());
    this._legends = [];
  }

  // ========== PRIVATE: DOM & RENDERER INITIALIZATION ==========

  _initDOMStructure() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: Arial, sans-serif; }
        .graph-container {
          width: ${this.width}px;
          height: ${this.height}px;
          background: #ffffff;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        svg { width: 100%; height: 100%; }

        .links line { stroke-opacity: 0.6; }
        .links .directional { marker-end: url(#arrowhead); }
        .links .semantic { stroke-opacity: 0.7; }

        .nodes circle { stroke: #fff; stroke-width: 1.5px; }
        .node-label { font-size: 12px; pointer-events: none; fill: #333; text-anchor: middle; dominant-baseline: middle; }

        .node-highlighted circle { stroke: #ff4444 !important; stroke-width: 3px !important; }
        .link-highlighted { stroke: #ff4444 !important; stroke-width: 2px !important; stroke-opacity: 1 !important; }

        .tooltip {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 10px;
          pointer-events: none;
          z-index: 10;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          max-width: 320px;
          font-size: 12px;
        }

        .link-tooltip {
          position: absolute;
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          pointer-events: none;
          z-index: 20;
          white-space: pre-line;
        }

        .context-menu {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          padding: 5px 0;
          z-index: 30;
        }
        .context-menu button {
          display: block;
          width: 100%;
          border: none;
          background: white;
          padding: 8px 15px;
          text-align: left;
          cursor: pointer;
        }
        .context-menu button:hover { background: #f0f0f0; }

        .notification {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 40;
          transition: opacity 0.5s;
          font-size: 12px;
        }
        .notification.info { background: #e3f2fd; border: 1px solid #2196f3; }
        .notification.error { background: #ffebee; border: 1px solid #f44336; }
        .notification.fade-out { opacity: 0; }
      </style>

      <div class="graph-container">
        <svg></svg>
      </div>
    `;

    const container = this.shadowRoot.querySelector(".graph-container");
    if (container && !this.renderer) {
      this.renderer = new ForceGraphRenderer({
        container,
        encodingManager: this.encodingManager,
        width: this.width,
        height: this.height,
        logger: this.logger,
        callbacks: {
          onNodeHover: (node, event, linkSel, nodeGroup) => this._onNodeMouseOver(node, event, linkSel, nodeGroup),
          onNodeOut: (linkSel, nodeGroup) => this._onNodeMouseOut(linkSel, nodeGroup),
          onLinkHover: (link, x, y) => this._showLinkTooltip(link, x, y),
          onLinkOut: () => this._hideLinkTooltip(),
          onNodeContextMenu: (node, x, y) => this._showContextMenu(node, x, y),
          onNodeClick: (node, event) => this.requestNodeDetails(node)
        }
      });
    }

    this._initGlobalHandlers();
  }

  _initGlobalHandlers() {
    const container = this.shadowRoot.querySelector(".graph-container");
    if (!container) return;

    container.addEventListener("click", () => {
      const menu = this.shadowRoot.querySelector(".context-menu");
      if (menu) menu.remove();
    });

    container.addEventListener("contextmenu", (e) => e.preventDefault());
    container.addEventListener("mouseleave", () => this._hideTooltip());
  }

  // ========== PRIVATE: DOMAINS & ENCODING ==========

  _populateDomains() {
    if (!this.nodes?.length) return;
    this.encodingManager.clearScaleCache();

    this.visualEncoding = this.encodingManager.populateDomainsFromData(this.visualEncoding, this.nodes, this.links);

    this.dispatchEvent(
      new CustomEvent("domainsCalculated", {
        detail: { encoding: this.getEncoding(), timestamp: new Date().toISOString() },
        bubbles: true
      })
    );
  }

  _resolveBackgroundColor() {
    const background = this.visualEncoding?.background;
    if (typeof background === "string" && background.trim()) {
      return background;
    }
    if (background && typeof background.value === "string" && background.value.trim()) {
      return background.value;
    }
    return "#ffffff";
  }

  // ========== PRIVATE: INTERACTION (HOVER, CONTEXT MENU, TOOLTIPS) ==========

  _onNodeMouseOver(node, event, linkSel, nodeSel) {
    const connectedLinks = this.links.filter((l) => l.source.id === node.id || l.target.id === node.id);
    const connectedNodeIds = new Set(connectedLinks.flatMap((l) => [l.source.id, l.target.id]));

    linkSel.classed("link-highlighted", (l) => l.source.id === node.id || l.target.id === node.id);
    nodeSel.classed("node-highlighted", (n) => connectedNodeIds.has(n.id));

    this._showTooltip(node, event.offsetX, event.offsetY);
  }

  _onNodeMouseOut(linkSel, nodeSel) {
    linkSel.classed("link-highlighted", false);
    nodeSel.classed("node-highlighted", false);
    this._hideTooltip();
  }

  _showContextMenu(node, x, y) {
    const old = this.shadowRoot.querySelector(".context-menu");
    if (old) old.remove();

    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const detailsBtn = document.createElement("button");
    detailsBtn.textContent = "Show details";
    detailsBtn.addEventListener("click", () => {
      this.requestNodeDetails(node);
      menu.remove();
    });

    menu.appendChild(detailsBtn);
    this.shadowRoot.querySelector(".graph-container")?.appendChild(menu);
  }

  _showTooltip(node, x, y) {
    this._hideTooltip();

    if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);

    this.tooltipTimeout = setTimeout(() => {
      const container = this.shadowRoot.querySelector(".graph-container");
      if (!container) return;

      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";

      const title = document.createElement("div");
      title.style.fontWeight = "bold";
      title.style.marginBottom = "6px";
      title.textContent = node.label || node.id;
      tooltip.appendChild(title);

      if (node.uri) {
        const uri = document.createElement("div");
        uri.style.wordBreak = "break-all";
        uri.textContent = node.uri;
        tooltip.appendChild(uri);
      }

      tooltip.style.left = `${x + 15}px`;
      tooltip.style.top = `${y - 15}px`;

      container.appendChild(tooltip);
    }, 150);
  }

  _hideTooltip() {
    if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
    const t = this.shadowRoot.querySelector(".tooltip");
    if (t) t.remove();
  }

  _showLinkTooltip(link, x, y) {
    this._hideLinkTooltip();

    const container = this.shadowRoot.querySelector(".graph-container");
    if (!container) return;

    const tooltip = document.createElement("div");
    tooltip.className = "link-tooltip";

    const s = link.source?.id ?? link.source;
    const t = link.target?.id ?? link.target;

    let txt = `${s} → ${t}`;
    if (link.type === "semantic") txt = `${s} ↔ ${t}\nRelation: ${link.semanticLabel || link.tooltip || "relation"}`;

    tooltip.textContent = txt;
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 10}px`;

    container.appendChild(tooltip);
  }

  _hideLinkTooltip() {
    const t = this.shadowRoot.querySelector(".link-tooltip");
    if (t) t.remove();
  }

  // ========== PRIVATE: HELPERS & UTILITIES ==========

  _notify(message, type = "info") {
    const old = this.shadowRoot.querySelector(".notification");
    if (old) old.remove();

    const container = this.shadowRoot.querySelector(".graph-container");
    if (!container) return;

    const n = document.createElement("div");
    n.className = `notification ${type}`;
    n.textContent = message;
    container.appendChild(n);

    setTimeout(() => {
      n.classList.add("fade-out");
      setTimeout(() => n.remove(), 500);
    }, 2500);
  }

  _getOrCreateScale(scaleKey, scaleConfig, data, field, isColorScale) {
    return this.encodingManager.getOrCreateD3Scale(
      scaleKey,
      scaleConfig,
      data,
      field,
      isColorScale,
      (config, nodeData, fieldName, isColor) => this.encodingManager.createD3Scale(config, nodeData, fieldName, isColor)
    );
  }

  createD3Scale(scaleConfig, data = null, field = null, defaultScale = null, isColorScale = false) {
    const scale = this.encodingManager.createD3Scale(scaleConfig, data, field, isColorScale);
    return scale || defaultScale;
  }

  _resolveEndpoint() {
    return (
      this.currentEndpoint ||
      this.sparqlEndpoint ||
      this.getAttribute("endpoint") ||
      "https://dbpedia.org/sparql"
    );
  }

  _resolveProxyUrl() {
    return this.currentProxyUrl || this.proxy || this.getAttribute("proxy-url") || null;
  }
}

customElements.define("vis-graph", VisGraph);
