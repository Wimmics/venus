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
import * as d3 from "d3";
import { SparqlDataFetcher } from "@wimmics/kgnovis-sparql";
import { DomainCalculator, ColorScaleCalculator } from "@wimmics/kgnovis-encoding";
import { createSparqlMapper, listSparqlMappers } from "@wimmics/kgnovis-mappers";
import { createLogger } from "@wimmics/kgnovis-core";

export class VisGraph extends HTMLElement {
  static get observedAttributes() {
    return ["width", "height", "endpoint", "proxy-url"];
  }

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
    this.domainCalculator = new DomainCalculator();
    this.colorScaleCalculator = new ColorScaleCalculator();

    this.scaleCache = new Map();
    this.lastEncodingHash = null;
    this.lastDataHash = null;

    // Public-ish internal state
    this.internalData = new WeakMap();
    this.internalData.set(this, {});
    this.visualEncoding = this.getDefaultEncoding();

    // UI timers
    this.tooltipTimeout = null;

    // Composition: externally provided node-details panel element
    this._nodeDetailsPanel = null;
  }

  // ---------- Composition API ----------

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

  // ---------- Logging / notifications ----------

  _notify(message, type = "info") {
    // Small in-graph notification (optional UI). Not a node-details responsibility.
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

  // ---------- Encoding basics ----------

  getDefaultEncoding() {
    return {
      description: "Default visual encoding",
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

  _calculateEncodingHash() {
    return JSON.stringify(this.visualEncoding);
  }

  _calculateDataHash() {
    return `nodes:${this.nodes.length}-links:${this.links.length}`;
  }

  _shouldInvalidateScaleCache() {
    const enc = this._calculateEncodingHash();
    const dat = this._calculateDataHash();
    const changed = this.lastEncodingHash !== enc || this.lastDataHash !== dat;

    if (changed) {
      this.scaleCache.clear();
      this.lastEncodingHash = enc;
      this.lastDataHash = dat;
    }
    return changed;
  }

  _getOrCreateScale(scaleKey, scaleConfig, data, field, isColorScale) {
    this._shouldInvalidateScaleCache();

    if (this.scaleCache.has(scaleKey)) return this.scaleCache.get(scaleKey);

    const scale = this.createD3Scale(scaleConfig, data, field, null, isColorScale);
    if (scale) this.scaleCache.set(scaleKey, scale);
    return scale;
  }

  // ---------- Public API (properties) ----------

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

  // ---------- Lifecycle ----------

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

  // ---------- Data loading ----------

  async launch() {
    try {
      // Apply user encoding if present
      if (this.encoding && this.encoding !== this.getDefaultEncoding()) {
        this.setEncoding(this.encoding);
      }

      // Priority 1: sparqlResult (preformatted JSON)
      if (this.sparqlResult) return await this.setSparqlResult(this.sparqlResult);

      // Priority 2: endpoint + query
      if (this.sparqlEndpoint && this.sparqlQuery) return await this.executeSparqlQuery();

      // Priority 3: manual data
      if (this.nodes?.length > 0) {
        this.render();
        return { status: "success", message: "Manual data rendered." };
      }

      throw new Error(
        "No data source configured. Define `sparqlResult`, `sparqlEndpoint`/`sparqlQuery`, or `nodes`/`links` before calling launch()."
      );
    } catch (e) {
      this.logger.error("launch failed", { message: e?.message });
      return { status: "error", message: e?.message || "Unknown error" };
    }
  }

  async executeSparqlQuery() {
    const endpoint = this.sparqlEndpoint;
    const query = this.sparqlQuery;
    const proxyUrl = this.proxy;

    if (!endpoint || !query) throw new Error("Configure sparqlEndpoint and sparqlQuery before executing");

    return await this.loadFromSparqlEndpoint(endpoint, query, null, proxyUrl);
  }

  setData(nodes, links) {
    this.nodes = nodes || [];
    this.links = links || [];

    this.domainCalculator?.clearCache?.();
    this.colorScaleCalculator?.clearCache?.();
    this.scaleCache.clear();

    this.updateEncodingWithCalculatedDomains();
    this.render();
  }

  setSparqlResult(jsonData) {
    return this.loadFromSparqlEndpoint(null, null, jsonData);
  }

  async loadFromSparqlEndpoint(endpoint, query, jsonData = null, proxyUrl = null) {
    try {
      this.currentEndpoint = endpoint;
      this.currentProxyUrl = proxyUrl;

      const result = await this.sparqlFetcher.fetchSparqlData(endpoint, query, jsonData, proxyUrl);

      if (result.status !== "success") return result;

      this.sparqlData = result.data;

      const graph = this.getData(result.data);
      this.nodes = graph.nodes;
      this.links = graph.links;

      this.updateEncodingWithCalculatedDomains();
      this.render();

      return {
        ...result,
        message: `Loaded: ${this.nodes.length} nodes, ${this.links.length} links`,
        data: graph
      };
    } catch (e) {
      return { status: "error", message: e?.message || "Unknown error", data: null };
    }
  }

  // ---------- SPARQL -> graph transform ----------

  getData(results) {
    const { graph, meta } = this.mapper.map(results, {
      encoding: this.visualEncoding,
      defaultEncoding: this.getDefaultEncoding(),
      createAdaptiveEncoding: (vars) => this.createAdaptiveEncoding(vars),
      resolveFieldMapping: (mapping, vars) => this.resolveFieldMapping(mapping, vars),
      logger: { warn: (msg, m) => this.logger.warn(msg, m) }
    });

    this.nodes = graph.nodes;
    this.links = graph.links;

    if (meta.usedAdaptiveEncoding) {
      this.visualEncoding = this.createAdaptiveEncoding(meta.vars);
      try {
        this.enhanceAdaptiveEncodingWithClassification(meta.vars, this.nodes);
      } catch (e) {
        this.logger.warn("Error while enhancing adaptive encoding", { message: e?.message });
      }
    }

    this.domainCalculator?.clearCache?.();
    this.colorScaleCalculator?.clearCache?.();
    this.scaleCache.clear();

    return graph;
  }

  createAdaptiveEncoding(sparqlVars) {
    if (!sparqlVars?.length) return this.getDefaultEncoding();

    const enc = this.getDefaultEncoding();
    enc.nodes.field = [sparqlVars[0]];

    if (sparqlVars.length > 1) enc.links.field = { source: sparqlVars[0], target: sparqlVars[1] };
    else enc.links.field = sparqlVars[0];

    return enc;
  }

  resolveFieldMapping(mapping, vars) {
    const linkField = mapping.links?.field;

    let sourceVar = vars[0];
    let targetVar = vars.length > 1 ? vars[1] : null;
    let linkType = "directional";

    if (mapping.nodes?.field?.length) sourceVar = mapping.nodes.field[0];

    if (linkField) {
      if (typeof linkField === "string") {
        if (vars.includes(linkField)) {
          linkType = "semantic";
          if (mapping.nodes?.field?.length >= 2) {
            sourceVar = mapping.nodes.field[0];
            targetVar = mapping.nodes.field[1];
          } else if (mapping.nodes?.field?.length === 1) {
            sourceVar = mapping.nodes.field[0];
            targetVar = null; // co-occurrence mode handled by mapper
          } else {
            throw new Error("For semantic links, at least 1 variable is required in nodes.field");
          }
        }
      } else if (typeof linkField === "object" && linkField) {
        if (linkField.source && linkField.target && vars.includes(linkField.source) && vars.includes(linkField.target)) {
          sourceVar = linkField.source;
          targetVar = linkField.target;
          linkType = "directional";
        }
      }
    }

    return { sourceVar, targetVar, linkType };
  }

  // ---------- Encoding validation / domains ----------

  setEncoding(encoding) {
    if (encoding === null) {
      if (this.sparqlData?.head?.vars) this.visualEncoding = this.createAdaptiveEncoding(this.sparqlData.head.vars);
      else this.visualEncoding = this.getDefaultEncoding();
    } else {
      if (!encoding?.nodes?.field) {
        this._notify('Invalid encoding: "nodes.field" is required (array with at least one SPARQL variable).', "error");
        return;
      }
      this.visualEncoding = { ...this.getDefaultEncoding(), ...encoding };
    }

    if (this.sparqlData) {
      const transformed = this.getData(this.sparqlData);
      this.nodes = transformed.nodes;
      this.links = transformed.links;
      this.updateEncodingWithCalculatedDomains();
    } else if (this.nodes?.length) {
      this.updateEncodingWithCalculatedDomains();
    }

    this.render();
  }

  updateEncodingWithCalculatedDomains() {
    if (!this.nodes?.length) return;

    // Nodes color
    if (this.visualEncoding.nodes?.color?.field && this.visualEncoding.nodes?.color?.scale) {
      const f = this.visualEncoding.nodes.color.field;
      const scaleType = this.visualEncoding.nodes.color.scale.type || "ordinal";
      const userDomain = this.visualEncoding.nodes.color.scale.domain;
      this.visualEncoding.nodes.color.scale.domain = this.domainCalculator.getDomain(this.nodes, f, userDomain, scaleType);
    }

    // Nodes size
    if (this.visualEncoding.nodes?.size?.field && this.visualEncoding.nodes?.size?.scale) {
      const f = this.visualEncoding.nodes.size.field;
      const scaleType = this.visualEncoding.nodes.size.scale.type || "linear";
      const userDomain = this.visualEncoding.nodes.size.scale.domain;
      this.visualEncoding.nodes.size.scale.domain = this.domainCalculator.getDomain(this.nodes, f, userDomain, scaleType);
    }

    this.dispatchEvent(
      new CustomEvent("domainsCalculated", {
        detail: { encoding: this.getEncoding(), timestamp: new Date().toISOString() },
        bubbles: true
      })
    );
  }

  getEncoding() {
    return JSON.parse(JSON.stringify(this.visualEncoding));
  }

  // Minimal version (optional): keep your existing enhancement logic if you want.
  enhanceAdaptiveEncodingWithClassification(_sparqlVars, _nodeData = null) {
    // Intentionally left minimal in this "clean" VisGraph.
    // Put your classification heuristics in a separate module if you want to keep VisGraph smaller.
  }

  // ---------- Rendering ----------

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: Arial, sans-serif; }
        .graph-container {
          width: ${this.width}px;
          height: ${this.height}px;
          background: #f9f9f9;
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

    this._createForceGraph();
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

  _createForceGraph() {
    const svg = d3.select(this.shadowRoot.querySelector("svg"));
    const width = this.width;
    const height = this.height;

    svg.selectAll("*").remove();

    // Arrow head for directional links
    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    if (!this.nodes?.length) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("No data to visualize");
      return;
    }

    // Validate nodes/links
    this.nodes = this.nodes.filter((n) => n && n.id != null);
    this.links = (this.links || []).filter((l) => l && l.source != null && l.target != null);

    const mapping = this.visualEncoding;

    // Node color scale
    const nodeColorConfig = mapping.nodes?.color || {};
    const nodeColorScale = nodeColorConfig.scale
      ? this._getOrCreateScale(`nodeColor-${nodeColorConfig.field}`, nodeColorConfig.scale, this.nodes, nodeColorConfig.field, true)
      : null;

    const getNodeColor = (d) => {
      if (nodeColorScale && nodeColorConfig.field && d[nodeColorConfig.field] !== undefined) {
        const dom = nodeColorScale.domain?.() || [];
        if (dom.includes(d[nodeColorConfig.field])) return nodeColorScale(d[nodeColorConfig.field]) || "#cccccc";
      }
      return nodeColorConfig.value || "#cccccc";
    };

    // Node size scale
    const nodeSizeConfig = mapping.nodes?.size || {};
    const nodeSizeScale = nodeSizeConfig.scale
      ? this._getOrCreateScale(`nodeSize-${nodeSizeConfig.field}`, nodeSizeConfig.scale, this.nodes, nodeSizeConfig.field, false)
      : null;

    const getNodeRadius = (d) => {
      if (nodeSizeScale && nodeSizeConfig.field && d[nodeSizeConfig.field] !== undefined) {
        const r = nodeSizeScale(d[nodeSizeConfig.field]);
        if (typeof r === "number" && !Number.isNaN(r) && r > 0) return r;
      }
      const fallback = nodeSizeConfig.value || 10;
      return typeof fallback === "number" && !Number.isNaN(fallback) && fallback > 0 ? fallback : 10;
    };

    // Link color
    const linkColorConfig = mapping.links?.color || {};
    const linkColorScale = linkColorConfig.scale
      ? this._getOrCreateScale(`linkColor-${linkColorConfig.field}`, linkColorConfig.scale, this.links, linkColorConfig.field, true)
      : null;

    const getLinkColor = (d) => {
      if (linkColorScale && linkColorConfig.field && d[linkColorConfig.field] !== undefined) {
        const dom = linkColorScale.domain?.() || [];
        if (dom.includes(d[linkColorConfig.field])) return linkColorScale(d[linkColorConfig.field]);
      }
      return linkColorConfig.value || "#999";
    };

    const linkWidthConfig = mapping.links?.width || mapping.links?.Width || {};
    const getLinkWidth = () => linkWidthConfig.value || 1.5;

    const linkDistance = mapping.links?.distance || 100;

    const simulation = d3
      .forceSimulation(this.nodes)
      .force("link", d3.forceLink(this.links).id((d) => d.id).distance(linkDistance))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d) => getNodeRadius(d) + 5))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    const constrainNode = (d) => {
      const r = getNodeRadius(d);
      d.x = Math.max(r, Math.min(width - r, d.x));
      d.y = Math.max(r, Math.min(height - r, d.y));
    };

    const link = svg
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(this.links)
      .enter()
      .append("line")
      .attr("class", (d) => d.type || "directional")
      .attr("stroke", getLinkColor)
      .attr("stroke-width", getLinkWidth())
      .on("mouseover", (event, d) => this._showLinkTooltip(d, event.offsetX, event.offsetY))
      .on("mouseout", () => this._hideLinkTooltip());

    const nodeGroup = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(this.nodes)
      .enter()
      .append("g")
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("mouseover", (event, d) => this._onNodeMouseOver(d, event, link, nodeGroup))
      .on("mouseout", () => this._onNodeMouseOut(link, nodeGroup))
      .on("contextmenu", (event, d) => {
        event.preventDefault();
        this._showContextMenu(d, event.offsetX, event.offsetY);
      });

    nodeGroup.append("circle").attr("r", getNodeRadius).attr("fill", getNodeColor);
    nodeGroup.append("text").attr("class", "node-label").text((d) => d.label || d.id);

    const calculateLinkPosition = (lnk) => {
      const source = lnk.source;
      const target = lnk.target;
      if (Number.isNaN(source.x) || Number.isNaN(source.y) || Number.isNaN(target.x) || Number.isNaN(target.y)) {
        return { x1: 0, y1: 0, x2: 0, y2: 0 };
      }

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return { x1: source.x, y1: source.y, x2: target.x, y2: target.y };

      const sr = getNodeRadius(source);
      const tr = getNodeRadius(target);

      const ux = dx / dist;
      const uy = dy / dist;

      return {
        x1: source.x + ux * sr,
        y1: source.y + uy * sr,
        x2: target.x - ux * tr,
        y2: target.y - uy * tr
      };
    };

    simulation.on("tick", () => {
      nodeGroup.each(constrainNode);

      link.each(function (d) {
        const p = calculateLinkPosition(d);
        d3.select(this).attr("x1", p.x1).attr("y1", p.y1).attr("x2", p.x2).attr("y2", p.y2);
      });

      nodeGroup.attr("transform", (d) => {
        const x = Number.isNaN(d.x) ? width / 2 : d.x;
        const y = Number.isNaN(d.y) ? height / 2 : d.y;
        return `translate(${x},${y})`;
      });
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

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

  // ---------- Scale creation (kept compatible with your encoding calculators) ----------

  createD3Scale(scaleConfig, data = null, field = null, defaultScale = null, isColorScale = false) {
    if (!scaleConfig) return defaultScale;

    const type = scaleConfig.type || "ordinal";

    let finalDomain;
    if (data && field && this.domainCalculator) {
      const userDomain = scaleConfig.domain;
      finalDomain = this.domainCalculator.getDomain(data, field, userDomain, type);
      if (!finalDomain?.length) return defaultScale;
    } else if (Array.isArray(scaleConfig.domain) && scaleConfig.domain.length) {
      finalDomain = scaleConfig.domain;
    } else {
      return defaultScale;
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
      return defaultScale;
    }
  }

  // ---------- Helpers ----------

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
