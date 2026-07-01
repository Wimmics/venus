/**
* Web component for force-directed graph visualization.
*
* Responsibilities:
* - Render a graph (D3 force simulation) from SPARQL JSON or manual nodes/links
* - Manage visual encoding and legends
* - Support user interactions (drag, zoom, tooltips)
*/
import { createRenderer } from "@wimmics/venus-rendering";
import { createEncodingManager } from "@wimmics/venus-encoding";
import { VIS_TYPES } from "@wimmics/venus-core";
import { createSparqlMapper } from "@wimmics/venus-transform";
import { createTooltipManager } from "@wimmics/venus-visual-mapping";

import { VenusBase } from "./vis-base.js";

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
		
		this.encodingManager = createEncodingManager(VIS_TYPES.VENUS_GRAPH);
		this.visualEncoding = this.encodingManager.getDefaultEncoding();
		
		this.mapper = createSparqlMapper(VIS_TYPES.VENUS_GRAPH)

		this.tooltipManager = createTooltipManager(VIS_TYPES.VENUS_GRAPH, { shadowRoot: this.shadowRoot })

		this._initDOMStructure();
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
		return this._getData()
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
					onClick: (payload) => this._onClick(payload)
				}
			});
		}
		
		this._initGlobalHandlers();
	}
	
	_initGlobalHandlers() {
		const container = this._getContainerElement();
		if (!container) return;
		
		container.addEventListener("mouseleave", () => this.tooltipManager.hideTooltip());
	}
	
	_onHover(payload = {}) {
		this.tooltipManager.showTooltip(payload)
	}
	
	_onOut() {
		this.tooltipManager.hideTooltip()
	}
	
	render() {
		super.render();
	}
}

if (!customElements.get(VIS_TYPES.VENUS_GRAPH)) {
	customElements.define(VIS_TYPES.VENUS_GRAPH, VenusGraph);
}
