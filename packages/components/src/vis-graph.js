/**
* Web component for force-directed graph visualization.
*
* Responsibilities:
* - Render a graph (D3 force simulation) from SPARQL JSON or manual nodes/links
* - Manage visual encoding and legends
* - Emit node selection / details requests
*
* Composition:
* - VenusGraph creates and owns a `venus-uri-meta` panel when `interactions.nodeDetailsPanel !== false`.
* - This owned panel shares the lifecycle of the VenusGraph instance.
*/
import { createRenderer } from "@wimmics/venus-d3renderer";
import { createEncodingManager } from "@wimmics/venus-encoding";
import { VIS_TYPES } from "@wimmics/venus-core";
import { createSparqlMapper } from "@wimmics/venus-mappers";

import { VenusBase } from "./vis-base.js";
import "./vis-uri-metadata.js";

export class VenusGraph extends VenusBase {
	constructor() {
		super({
			componentName: "VenusGraph",
			visType: VIS_TYPES.VENUS_GRAPH,
			defaultWidth: 800,
			defaultHeight: 600
		});
		
		this.nodes = [];
		this.links = [];
		this.selectedNode = null;
		
		this._nodeDetailsPanel = null;
		this._ownsNodeDetailsPanel = false;
		
		this.encodingManager = createEncodingManager(VIS_TYPES.VENUS_GRAPH);
		this.visualEncoding = this.encodingManager.getDefaultEncoding();
		
		this.mapper = createSparqlMapper(VIS_TYPES.VENUS_GRAPH)

		this._initDOMStructure();
	}
	
	/**
	* Optional backward-compatible external override.
	* When set, VenusGraph stops owning an internal `venus-uri-meta` panel.
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
			console.warn("This node has no associated URI")
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
				console.warn("Failed to create nodeDetailsPanel", { message: error?.message });
			}
		}
	}
	
	disconnectedCallback() {
		this._teardownOwnedNodeDetailsPanel();
		super.disconnectedCallback();
	}
	
	_setDataFromBuildResult(result) {
		const { graph } = result;
		this.nodes = graph?.nodes || [];
		this.links = graph?.links || [];
	}
	
	_hasData() {
		return Array.isArray(this.nodes) && this.nodes.length > 0;
	}
	
	// TODO: check if these methods are useful and whether we can merge them
	_getRenderPayload() {
		return { nodes: this.nodes, links: this.links };
	}
	
	_getLegendDatasets() {
		return { nodes: this.nodes, links: this.links };
	}

	_getData() {
		return { nodes: this.nodes, links: this.links };
	}

	_resetDataState() {
		this.nodes = []
		this.links = []
	}

	_initDOMStructure() {
		this._renderBaseDOM({
			extraStyles: `
        .links line { stroke-opacity: 0.6; }
        .links .directional { marker-end: url(#arrowhead); }
        .links .semantic,
        .links .cooccurrence { stroke-opacity: 0.7; }
			
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
			this.renderer = createRenderer(VIS_TYPES.VENUS_GRAPH, {
				container,
				width: this.width,
				height: this.height,
				callbacks: {
					onHover: (payload) => this._onHover(payload),
					onOut: (payload) => this._onOut(payload),
					onClick: (payload) => this._onClick(payload),
					onContextMenu: (payload) => this._onContextMenu(payload)
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
	
	_onHover(payload = {}) {
		if (payload.mark === "node") {
			this._showTooltip(payload.datum, payload.x, payload.y);
			return;
		}
		if (payload.mark === "link") {
			this._showLinkTooltip(payload.datum, payload.x, payload.y);
		}
	}
	
	_onOut(payload = {}) {
		if (payload.mark === "node") {
			this._hideTooltip();
			return;
		}
		if (payload.mark === "link") {
			this._hideLinkTooltip();
		}
	}
	
	_onClick(payload = {}) {
		if (payload.mark === "node") {
			this.requestNodeDetails(payload.datum);
		}
	}
	
	_onContextMenu(payload = {}) {
		if (payload.mark === "node") {
			this._showContextMenu(payload.datum, payload.x, payload.y);
		}
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
		const nodeConfig = this._resolveNodeRoleConfig(node);
		const lines = this._buildNodeTooltipLines(node);
		super._showTooltip(
			{
				title: this._resolveTooltipTitle(node, nodeConfig, node.id),
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
		
		const preferredOrder = ["id", "label", "uri", "type"];
		const nodeConfig = this._resolveNodeRoleConfig(node);
		const sizeMetric = nodeConfig?.size?.metric;
		const colorMetric = nodeConfig?.color?.metric;
		if (sizeMetric === "degree" || colorMetric === "degree") {
			preferredOrder.push("degree");
		}
		const fields = this._resolveTooltipFields(node, {
			preferredOrder,
			excludeKeys: ["source", "target"],
			markTooltipFields: Array.isArray(nodeConfig?.tooltip?.fields)
			? nodeConfig.tooltip.fields
			: null
		});
		
		const lines = [];
		for (const fieldName of fields) {
			if (fieldName === "label") continue;
			lines.push(`${fieldName}: ${this._formatTooltipValue(node[fieldName])}`);
		}
		
		return lines;
	}
	
	_resolveNodeRoleConfig(node) {
		const nodes = this.visualEncoding?.nodes || {};
		const roles = Array.isArray(node?.roles) ? node.roles : [];
		if (roles.length !== 1 || !nodes[roles[0]]) return nodes;
		return {
			...nodes,
			...nodes[roles[0]],
			tooltip: nodes[roles[0]].tooltip || nodes.tooltip
		};
	}
	
	_hideTooltip() {
		super._hideTooltip("tooltip node-tooltip");
	}
	
	_showLinkTooltip(link, x, y) {
		const fallbackTitle = `${link.source?.id ?? link.source} → ${link.target?.id ?? link.target}`;
		const title = this._resolveTooltipTitle(link, this.visualEncoding?.links, fallbackTitle);
		const lines = this._buildTooltipLines(link, {
			preferredOrder: this._getLinkTooltipPreferredOrder(link),
			excludeKeys: ["source", "target"],
			markConfig: this.visualEncoding?.links
		});
		super._showTooltip({ title, lines }, x, y, {
			className: "tooltip link-tooltip",
			offsetX: 10,
			offsetY: -10,
			dark: true,
			maxWidth: 380
		});
	}
	
	_getLinkTooltipPreferredOrder(link) {
		if (link?.type === "semantic") {
			return ["semanticLabel", "relationshipType"];
		}
		if (link?.type === "cooccurrence") {
			return ["semanticLabel", "relationshipType", "weight", "sharedValuesCount"];
		}
		return [];
	}
	
	_hideLinkTooltip() {
		super._hideTooltip("tooltip link-tooltip");
	}
	
	render() {
		this._ensureNodeDetailsPanel();
		super.render();
	}
}

if (!customElements.get(VIS_TYPES.VENUS_GRAPH)) {
	customElements.define(VIS_TYPES.VENUS_GRAPH, VenusGraph);
}
