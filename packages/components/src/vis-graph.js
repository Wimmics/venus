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
import { createRenderer } from "@wimmics/venus-rendering";
import { createEncodingManager } from "@wimmics/venus-encoding";
import { MARK_TYPES, VIS_TYPES } from "@wimmics/venus-core";
import { createSparqlMapper } from "@wimmics/venus-transform";
import { createTooltipManager } from "@wimmics/venus-visual-mapping";

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

		this.tooltipManager = createTooltipManager(VIS_TYPES.VENUS_GRAPH, { shadowRoot: this.shadowRoot })

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
        .links .semantic, .links .directional { marker-end: url(#arrowhead); }
        
        .links .cooccurrence { stroke-opacity: 0.7; }
			
        .node-label { font-size: 12px; pointer-events: none; fill: #333; text-anchor: middle; dominant-baseline: middle; }
			
        .node-downplayed {
			opacity: 0.15;
		}

		.link-downplayed {
			opacity: 0.08;
		}

		.node-downplayed text,
		.link-downplayed text {
			opacity: 0.05;
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
		container.addEventListener("mouseleave", () => this.tooltipManager.hideTooltip());
	}
	
	_onHover(payload = {}) {
		this.tooltipManager.showTooltip(payload)
	}
	
	_onOut() {
		this.tooltipManager.hideTooltip()
	}
	
	// TODO: to be re-designed on the future
	_onClick(payload = {}) {
		if (payload.mark === MARK_TYPES.NODES) {
			this.requestNodeDetails(payload.datum);
		}
	}
	
	_onContextMenu(payload = {}) {
		if (payload.mark === MARK_TYPES.NODES) {
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

	
	render() {
		this._ensureNodeDetailsPanel();
		super.render();
	}
}

if (!customElements.get(VIS_TYPES.VENUS_GRAPH)) {
	customElements.define(VIS_TYPES.VENUS_GRAPH, VenusGraph);
}
