import { createRenderer } from "@wimmics/venus-d3renderer";
import { createEncodingManager } from "@wimmics/venus-encoding";
import { VIS_TYPES } from "@wimmics/venus-core";
import { createSparqlMapper } from "@wimmics/venus-mappers";

import { VenusBase } from "./vis-base.js";
import { createTooltipManager } from "./tooltips/tooltips-factory.js";

export class VenusScatterPlot extends VenusBase {
	constructor() {
		super({
			componentName: "VenusScatterPlot",
			visType: VIS_TYPES.VENUS_SCATTERPLOT,
			defaultWidth: 800,
			defaultHeight: 500
		});
		
		this.rows = [];
		this.encodingManager = createEncodingManager(VIS_TYPES.VENUS_SCATTERPLOT);
		this.visualEncoding = this.encodingManager.getDefaultEncoding();
		this.mapper = createSparqlMapper(VIS_TYPES.VENUS_SCATTERPLOT)

		this.tooltipManager = createTooltipManager(VIS_TYPES.VENUS_SCATTERPLOT, { shadowRoot: this.shadowRoot })
		
		this._initDOMStructure();
	}


	_setDataFromBuildResult(result) {
		this.chart = result.chart;
		this.rows = result.chart?.rows || [];
	}
	
	_hasData() {
		return Array.isArray(this.rows) && this.rows.length > 0;
	}

	_getData() {
		return { points: this.rows || [] }
	}
	
	_resetDataState() {
		this.rows = []
		this.chart = null
	}
	
	_getRenderPayload() {
		return { 
			rows: this.rows || [], 
			chart: this.chart || null 
		};
	}

	
	_initDOMStructure() {
		this._renderBaseDOM();
		
		const container = this._getContainerElement();
		if (container && !this.renderer) {
			this.renderer = createRenderer(VIS_TYPES.VENUS_SCATTERPLOT, {
				container,
				encodingManager: this.encodingManager,
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
	}
	
	_onHover(payload = {}) {
		// if (payload.mark !== "point") return;
		// const { datum, x, y } = payload;
		// const xField = this.visualEncoding?.x?.field;
		// const yField = this.visualEncoding?.y?.field;
		// const colorField = this.visualEncoding?.points?.color?.field;
		// const sizeField = this.visualEncoding?.points?.size?.field;
		// const title = this._resolveTooltipTitle(
		// 	datum,
		// 	this.visualEncoding?.points,
		// 	xField ? datum?.[xField] : "Point"
		// );
		// const lines = this._buildTooltipLines(datum, {
		// 	preferredOrder: [xField, yField, colorField, sizeField],
		// 	markConfig: this.visualEncoding?.points
		// });
		
		// this.tooltipManager.showTooltip({ title, lines }, x, y, {
		// 	className: "tooltip scatter-tooltip",
		// 	offsetX: 12,
		// 	offsetY: -12,
		// 	delayMs: 80
		// });
		this.tooltipManager.showTooltip(payload)
	}
	
	_onOut() {
		this.tooltipManager.hideTooltip()
	}
}

if (!customElements.get(VIS_TYPES.VENUS_SCATTERPLOT)) {
	customElements.define(VIS_TYPES.VENUS_SCATTERPLOT, VenusScatterPlot);
}
