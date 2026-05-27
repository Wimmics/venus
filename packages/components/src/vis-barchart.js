import { createRenderer } from "@wimmics/venus-d3renderer";
import { createEncodingManager } from "@wimmics/venus-encoding";
import { VIS_TYPES } from "@wimmics/venus-core";
import { buildBarChart } from "@wimmics/venus-datasource";
import { VenusBase } from "./vis-base.js";

export class VenusBarChart extends VenusBase {
  constructor() {
    super({
      componentName: "VenusBarChart",
      visType: VIS_TYPES.VENUS_BARCHART,
      defaultWidth: 800,
      defaultHeight: 500
    });

    this.rows = [];
    this.encodingManager = createEncodingManager(VIS_TYPES.VENUS_BARCHART);
    this.visualEncoding = this.encodingManager.getDefaultEncoding();

    this._initDOMStructure();
  }

  _buildVisualization(params) {
    return buildBarChart(params);
  }

  _setDataFromBuildResult(result) {
    const { chart } = result;
    this.rows = chart?.rows || [];
  }

  // _populateDomains() {
  //   if (!this.rows?.length) return;
  //   this.visualEncoding = this.encodingManager.populateDomainsFromData(this.visualEncoding, this.rows);
  // }

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
    return "Failed to build bar chart";
  }

  _getBuildErrorLogKey() {
    return "buildBarChart failed";
  }

  _initDOMStructure() {
    this._renderBaseDOM({
      containerClass: "chart-container",
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
      this.renderer = createRenderer(VIS_TYPES.VENUS_BARCHART, {
        container,
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
    if (payload.mark !== "bar") return;
    const { datum, x, y } = payload;
    const xField = this.visualEncoding?.x?.field;
    const yField = this.visualEncoding?.y?.field;
    const groupField = this.visualEncoding?.bars?.groups?.field;
    const colorField = this.visualEncoding?.bars?.color?.field;
    const sizeField = this.visualEncoding?.bars?.size?.field;
    const title = this._resolveTooltipTitle(
      datum,
      this.visualEncoding?.bars,
      xField ? datum?.[xField] : "Bar"
    );
    const lines = this._buildTooltipLines(datum, {
      preferredOrder: [yField, groupField, colorField, sizeField],
      excludeKeys: [xField],
      markConfig: this.visualEncoding?.bars
    });

    this._showTooltip({ title, lines }, x, y, {
      className: "tooltip bar-tooltip",
      offsetX: 12,
      offsetY: -12,
      delayMs: 80
    });
  }

  _onOut(payload = {}) {
    if (payload.mark && payload.mark !== "bar") return;
    this._hideTooltip("tooltip bar-tooltip");
  }
}

if (!customElements.get(VIS_TYPES.VENUS_BARCHART)) {
  customElements.define(VIS_TYPES.VENUS_BARCHART, VenusBarChart);
}
