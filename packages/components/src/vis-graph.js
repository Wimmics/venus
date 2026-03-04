/**
 * Web component for force-directed graph visualization.
 *
 * Responsibilities:
 * - Render a graph (D3 force simulation) from SPARQL JSON or manual nodes/links
 * - Manage visual encoding and legends
 * - Emit node selection / details requests
 *
 * Composition:
 * - VisGraph creates and owns a `venus-uri-meta` panel when `interactions.nodeDetailsPanel !== false`.
 * - This owned panel shares the lifecycle of the VisGraph instance.
 */
import { createRenderer } from "@wimmics/venus-d3renderer";
import { createEncodingManager } from "@wimmics/venus-encoding";
import { VIS_TYPES } from "@wimmics/venus-core";
import { buildForceGraph } from "@wimmics/venus-datasource";
import { VisBase } from "./vis-base.js";
import "./vis-uri-metadata.js";

export class VisGraph extends VisBase {
  constructor() {
    super({
      componentName: "VisGraph",
      visType: VIS_TYPES.FORCE_GRAPH,
      defaultWidth: 800,
      defaultHeight: 600
    });

    this.nodes = [];
    this.links = [];
    this.selectedNode = null;

    this._nodeDetailsPanel = null;
    this._ownsNodeDetailsPanel = false;

    this.encodingManager = createEncodingManager(VIS_TYPES.FORCE_GRAPH);
    this.visualEncoding = this.encodingManager.getDefaultEncoding();

    this._initDOMStructure();
  }

  /**
   * Optional backward-compatible external override.
   * When set, VisGraph stops owning an internal `venus-uri-meta` panel.
   */
  set nodeDetailsPanel(el) {
    if (this._ownsNodeDetailsPanel && this._nodeDetailsPanel && this._nodeDetailsPanel !== el) {
      this._nodeDetailsPanel.remove();
    }
    this._ownsNodeDetailsPanel = false;
    this._nodeDetailsPanel = el || null;
  }
  get nodeDetailsPanel() {
    return this._nodeDetailsPanel;
  }

  requestNodeDetails(node) {
    if (!node?.uri) {
      this._notify("This node has no associated URI", "error");
      this.logger.warn("requestNodeDetails called without node.uri", { node });
      return;
    }

    const endpoint = this._resolveEndpoint();
    const proxyUrl = this._resolveProxyUrl();

    this.dispatchEvent(
      new CustomEvent("nodeDetailsRequested", {
        detail: { node, endpoint, proxyUrl },
        bubbles: true,
        composed: true
      })
    );

    const panel = this._nodeDetailsPanel;
    if (panel) {
      try {
        panel.sparqlEndpoint = endpoint;
        panel.endpoint = endpoint;
        panel.proxy = proxyUrl;
        panel.node = node;
        panel.open = true;
      } catch (error) {
        this.logger.warn("Failed to drive nodeDetailsPanel", { message: error?.message });
      }
    }
  }

  disconnectedCallback() {
    this._teardownOwnedNodeDetailsPanel();
    super.disconnectedCallback();
  }

  _buildVisualization(params) {
    return buildForceGraph(params);
  }

  _setDataFromBuildResult(result) {
    const { graph } = result;
    this.nodes = graph?.nodes || [];
    this.links = graph?.links || [];
  }

  _getAdaptiveEncodingArgs(meta) {
    return [meta?.vars, this.nodes];
  }

  _populateDomains() {
    if (!this.nodes?.length) return;
    this.encodingManager.clearScaleCache();

    this.visualEncoding = this.encodingManager.populateDomainsFromData(
      this.visualEncoding,
      this.nodes,
      this.links
    );

    this.dispatchEvent(
      new CustomEvent("domainsCalculated", {
        detail: { encoding: this.getEncoding(), timestamp: new Date().toISOString() },
        bubbles: true
      })
    );
  }

  _hasData() {
    return Array.isArray(this.nodes) && this.nodes.length > 0;
  }

  _getRenderPayload() {
    return { nodes: this.nodes, links: this.links };
  }

  _getLegendDatasets() {
    return { nodes: this.nodes, links: this.links };
  }

  _getArtifactPayload() {
    return { nodes: this.nodes, links: this.links };
  }

  _getBuildErrorMessage() {
    return "Failed to build force graph";
  }

  _getBuildErrorLogKey() {
    return "buildForceGraph failed";
  }

  _initDOMStructure() {
    this._renderBaseDOM({
      containerClass: "graph-container",
      extraStyles: `
        .links line { stroke-opacity: 0.6; }
        .links .directional { marker-end: url(#arrowhead); }
        .links .semantic { stroke-opacity: 0.7; }

        .node-label { font-size: 12px; pointer-events: none; fill: #333; text-anchor: middle; dominant-baseline: middle; }

        .node-highlighted circle { stroke: #ff4444 !important; stroke-width: 3px !important; }
        .link-highlighted { stroke: #ff4444 !important; stroke-width: 2px !important; stroke-opacity: 1 !important; }

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
      `
    });

    const container = this._getContainerElement();
    if (container && !this.renderer) {
      this.renderer = createRenderer(VIS_TYPES.FORCE_GRAPH, {
        container,
        encodingManager: this.encodingManager,
        width: this.width,
        height: this.height,
        logger: this.logger,
        callbacks: {
          onNodeHover: (node, event, linkSel, nodeGroup) =>
            this._onNodeMouseOver(node, event, linkSel, nodeGroup),
          onNodeOut: (linkSel, nodeGroup) => this._onNodeMouseOut(linkSel, nodeGroup),
          onLinkHover: (link, x, y) => this._showLinkTooltip(link, x, y),
          onLinkOut: () => this._hideLinkTooltip(),
          onNodeContextMenu: (node, x, y) => this._showContextMenu(node, x, y),
          onNodeClick: (node) => this.requestNodeDetails(node)
        }
      });
    }

    this._initGlobalHandlers();
  }

  _isNodeDetailsPanelEnabled() {
    return this.visualEncoding?.interactions?.nodeDetailsPanel !== false;
  }

  _ensureNodeDetailsPanel() {
    if (!this._isNodeDetailsPanelEnabled()) {
      this._teardownOwnedNodeDetailsPanel();
      return;
    }

    if (this._nodeDetailsPanel) return;
    const container = this._getContainerElement();
    if (!container) return;

    const panel = document.createElement("venus-uri-meta");
    panel.logger = this.logger;
    panel.proxy = this._resolveProxyUrl();
    panel.sparqlEndpoint = this._resolveEndpoint();
    container.appendChild(panel);

    this._nodeDetailsPanel = panel;
    this._ownsNodeDetailsPanel = true;
  }

  _teardownOwnedNodeDetailsPanel() {
    if (!this._ownsNodeDetailsPanel || !this._nodeDetailsPanel) return;
    this._nodeDetailsPanel.remove();
    this._nodeDetailsPanel = null;
    this._ownsNodeDetailsPanel = false;
  }

  _initGlobalHandlers() {
    const container = this._getContainerElement();
    if (!container) return;

    container.addEventListener("click", () => {
      const menu = this.shadowRoot.querySelector(".context-menu");
      if (menu) menu.remove();
    });

    container.addEventListener("contextmenu", (event) => event.preventDefault());
    container.addEventListener("mouseleave", () => this._hideTooltip());
  }

  _onNodeMouseOver(node, event, linkSel, nodeSel) {
    const connectedLinks = this.links.filter((link) => link.source.id === node.id || link.target.id === node.id);
    const connectedNodeIds = new Set(connectedLinks.flatMap((link) => [link.source.id, link.target.id]));

    linkSel.classed("link-highlighted", (link) => link.source.id === node.id || link.target.id === node.id);
    nodeSel.classed("node-highlighted", (graphNode) => connectedNodeIds.has(graphNode.id));

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
    this._getContainerElement()?.appendChild(menu);
  }

  _showTooltip(node, x, y) {
    const lines = this._buildNodeTooltipLines(node);
    super._showTooltip(
      {
        title: node.label || node.id,
        lines
      },
      x,
      y,
      {
        className: "tooltip node-tooltip",
        offsetX: 15,
        offsetY: -15,
        delayMs: 150,
        maxWidth: 320
      }
    );
  }

  _buildNodeTooltipLines(node) {
    if (!node || typeof node !== "object") return [];

    const configuredFields = this.visualEncoding?.interactions?.tooltip?.fields;
    const hasConfiguredFields = Array.isArray(configuredFields) && configuredFields.length > 0;
    const fields = hasConfiguredFields ? configuredFields : this._getDefaultTooltipFields(node);

    const lines = [];
    for (const fieldName of fields) {
      if (fieldName === "label") continue;
      if (!Object.prototype.hasOwnProperty.call(node, fieldName)) continue;
      const value = node[fieldName];
      if (value === undefined || value === null) continue;
      lines.push(`${fieldName}: ${this._formatTooltipValue(value)}`);
    }

    return lines;
  }

  _getDefaultTooltipFields(node) {
    const preferredOrder = ["id", "label", "uri", "type"];
    const sizeField = this.visualEncoding?.nodes?.size?.field;
    if (sizeField === "links") {
      preferredOrder.push("links");
    }
    const ordered = [];
    const seen = new Set();

    for (const key of preferredOrder) {
      if (Object.prototype.hasOwnProperty.call(node, key) && node[key] !== undefined && node[key] !== null) {
        ordered.push(key);
        seen.add(key);
      }
    }

    const sparqlKeys = Object.keys(node.originalData || {});
    for (const key of sparqlKeys) {
      if (seen.has(key)) continue;
      if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
      if (node[key] === undefined || node[key] === null) continue;
      ordered.push(key);
      seen.add(key);
    }

    // Fallback for non-SPARQL/manual nodes: include non-rendering fields only.
    if (!ordered.length) {
      const renderingKeys = new Set([
        "x", "y", "vx", "vy", "fx", "fy", "px", "py", "index",
        "sourceLinks", "targetLinks", "originalData"
      ]);
      for (const key of Object.keys(node)) {
        if (renderingKeys.has(key) || seen.has(key)) continue;
        const value = node[key];
        if (value === undefined || value === null) continue;
        ordered.push(key);
        seen.add(key);
      }
    }

    return ordered;
  }

  _formatTooltipValue(value) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  _hideTooltip() {
    super._hideTooltip("tooltip node-tooltip");
  }

  _showLinkTooltip(link, x, y) {
    const source = link.source?.id ?? link.source;
    const target = link.target?.id ?? link.target;
    let txt = `${source} → ${target}`;
    if (link.type === "semantic") {
      txt = `${source} ↔ ${target}\nRelation: ${link.semanticLabel || link.tooltip || "relation"}`;
    }
    super._showTooltip(txt, x, y, {
      className: "tooltip link-tooltip",
      offsetX: 10,
      offsetY: -10,
      dark: true,
      whiteSpace: "pre-line",
      maxWidth: 380
    });
  }

  _hideLinkTooltip() {
    super._hideTooltip("tooltip link-tooltip");
  }

  render() {
    this._ensureNodeDetailsPanel();
    super.render();
  }
}

if (!customElements.get("venus-graph")) {
  customElements.define("venus-graph", VisGraph);
}
