
import { createRenderer } from "@wimmics/venus-rendering";
import { VIS_TYPES } from "@wimmics/venus-core";

import { createEncodingManager } from "@wimmics/venus-encoding";
import { createSparqlMapper } from "@wimmics/venus-transform";
import { createTooltipManager } from "@wimmics/venus-visual-mapping";
import { VenusBase } from "./vis-base.js";

export class VenusSankey extends VenusBase {
    constructor() {
        super({
            componentName: "VenusSankey",
            visType: VIS_TYPES.VENUS_SANKEY,
            defaultWidth: 800,
            defaultHeight: 600
        });
        
        this.nodes = [];
        this.links = [];
        
        this.encodingManager = createEncodingManager(VIS_TYPES.VENUS_SANKEY);
        this.visualEncoding = this.encodingManager.getDefaultEncoding();
        
        this.mapper = createSparqlMapper(VIS_TYPES.VENUS_SANKEY)

        this.tooltipManager = createTooltipManager(VIS_TYPES.VENUS_SANKEY, { shadowRoot: this.shadowRoot })

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
                 .node-downplayed {
                    opacity: 0.15;
                }

                .link-downplayed {
                    opacity: 0.08;
                }

            `
        });
        
        const container = this._getContainerElement();
        if (container && !this.renderer) {
            this.renderer = createRenderer(VIS_TYPES.VENUS_SANKEY, {
                container,
                width: this.width,
                height: this.height,
                callbacks: {
                    onHover: (payload) => this._onHover(payload),
                    onOut: (payload) => this._onOut(payload),
                    // onClick: (payload) => this._onClick(payload),
                    // onContextMenu: (payload) => this._onContextMenu(payload)
                }
            });
        }
    }

    _onHover(payload = {}) {
		this.tooltipManager.showTooltip(payload)
	}
	
	_onOut() {
		this.tooltipManager.hideTooltip()
	}

}

if (!customElements.get(VIS_TYPES.VENUS_SANKEY)) {
    customElements.define(VIS_TYPES.VENUS_SANKEY, VenusSankey);
}