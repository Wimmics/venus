import { createRenderer } from "@wimmics/venus-rendering";
import { createEncodingManager } from "@wimmics/venus-encoding";
import { VIS_TYPES } from "@wimmics/venus-core";
import { createSparqlMapper } from "@wimmics/venus-transform";
import { createTooltipManager } from "@wimmics/venus-visual-mapping";

import { VenusBase } from "./vis-base.js";


export class VenusLineChart extends VenusBase {
  constructor() {
    super({
      componentName: "VenusLineChart",
      visType: VIS_TYPES.VENUS_LINECHART,
      defaultWidth: 800,
      defaultHeight: 500
    });

    this.rows = [];
    this.encodingManager = createEncodingManager(VIS_TYPES.VENUS_LINECHART);
    this.visualEncoding = this.encodingManager.getDefaultEncoding();
    this.mapper = createSparqlMapper(VIS_TYPES.VENUS_LINECHART)

    this.tooltipManager = createTooltipManager(VIS_TYPES.VENUS_LINECHART, { shadowRoot: this.shadowRoot })

    this._initDOMStructure();
  }

  _setDataFromBuildResult(result) {
		this.chart = result.chart;
		this.rows = result.chart?.rows || [];
	}

  _hasData() {
    return Array.isArray(this.rows) && this.rows.length > 0;
  }

  _resetDataState() {
		this.rows = []
		this.chart = null
	}

  _getData() {
		return { lines: this.rows || [], points: this.rows || [] }
	}
	
	_getChart() {
		return this.chart;
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
      this.renderer = createRenderer(VIS_TYPES.VENUS_LINECHART, {
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
    this.tooltipManager.showTooltip(payload)
  }

  _onOut() {
    this.tooltipManager.hideTooltip()
  }
}

if (!customElements.get(VIS_TYPES.VENUS_LINECHART)) {
  customElements.define(VIS_TYPES.VENUS_LINECHART, VenusLineChart);
}
