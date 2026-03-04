import { createRenderer } from "@wimmics/venus-d3renderer";
import { createEncodingManager } from "@wimmics/venus-encoding";
import { VIS_TYPES } from "@wimmics/venus-core";
import { buildScatterPlot } from "@wimmics/venus-datasource";
import { VenusBase } from "./vis-base.js";

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

    this._initDOMStructure();
  }

  _buildVisualization(params) {
    return buildScatterPlot(params);
  }

  _setDataFromBuildResult(result) {
    const { chart } = result;
    this.rows = chart?.rows || [];
  }

  _populateDomains() {
    if (!this.rows?.length) return;
    this.encodingManager.clearScaleCache();
    this.visualEncoding = this.encodingManager.populateDomainsFromData(this.visualEncoding, this.rows);
  }

  _hasData() {
    return Array.isArray(this.rows) && this.rows.length > 0;
  }

  _getRenderPayload() {
    return { rows: this.rows };
  }

  _getLegendDatasets() {
    return { rows: this.rows };
  }

  _getArtifactPayload() {
    return { rows: this.rows };
  }

  _getBuildErrorMessage() {
    return "Failed to build scatter plot";
  }

  _getBuildErrorLogKey() {
    return "buildScatterPlot failed";
  }

  _initDOMStructure() {
    this._renderBaseDOM({
      containerClass: "scatter-plot-container",
      extraStyles: `
        .plot-area text {
          fill: #333;
          font-size: 11px;
        }
        .plot-area .domain,
        .plot-area .tick line {
          stroke: #cfcfcf;
        }
      `
    });

    const container = this._getContainerElement();
    if (container && !this.renderer) {
      this.renderer = createRenderer(VIS_TYPES.VENUS_SCATTERPLOT, {
        container,
        encodingManager: this.encodingManager,
        width: this.width,
        height: this.height,
        logger: this.logger,
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
    if (payload.mark !== "point") return;
    const { datum, x, y } = payload;
    const xField = this.visualEncoding?.x?.field;
    const yField = this.visualEncoding?.y?.field;
    const colorField = this.visualEncoding?.points?.color?.field;
    const sizeField = this.visualEncoding?.points?.size?.field;
    const title = xField ? datum?.[xField] : "Point";
    const lines = this._buildTooltipLines(datum, {
      preferredOrder: [xField, yField, colorField, sizeField]
    });

    this._showTooltip({ title, lines }, x, y, {
      className: "tooltip scatter-tooltip",
      offsetX: 12,
      offsetY: -12,
      delayMs: 80
    });
  }

  _onOut(payload = {}) {
    if (payload.mark && payload.mark !== "point") return;
    this._hideTooltip("tooltip scatter-tooltip");
  }
}

if (!customElements.get(VIS_TYPES.VENUS_SCATTERPLOT)) {
  customElements.define(VIS_TYPES.VENUS_SCATTERPLOT, VenusScatterPlot);
}
