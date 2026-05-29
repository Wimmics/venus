import { createRenderer } from "@wimmics/venus-d3renderer";
import { createEncodingManager } from "@wimmics/venus-encoding";
import { VIS_TYPES } from "@wimmics/venus-core";
import { buildLineChart } from "@wimmics/venus-datasource";
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

    this._initDOMStructure();
  }

  _buildVisualization(params) {
    return buildLineChart(params);
  }

  _setDataFromBuildResult(result) {
    const { chart } = result;
    this.rows = chart?.rows || [];
  }

  // _populateDomains() {
  //   if (!this.rows?.length) return;
  //   this.encodingManager.clearScaleCache();
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

  _initDOMStructure() {
    this._renderBaseDOM({
      containerClass: "line-chart-container",
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
    if (payload.mark !== "point" && payload.mark !== "series") return;
    const { datum, x, y } = payload;
    if (!datum) return;
    const xField = this.visualEncoding?.x?.field;
    const yField = this.visualEncoding?.y?.field;
    const groupField = this.visualEncoding?.lines?.group?.field;
    const colorField = this.visualEncoding?.lines?.color?.field;
    const sizeField = this.visualEncoding?.lines?.size?.field;
    const isSeriesHover = payload.mark === "series";
    const fallbackTitle = isSeriesHover
      ? (groupField ? datum?.[groupField] : (payload.seriesKey || "Series"))
      : (xField ? datum?.[xField] : "Point");
    const pointMarkConfig = this.visualEncoding?.points?.display !== false
      ? this.visualEncoding?.points
      : this.visualEncoding?.lines;
    const tooltipMarkConfig = isSeriesHover ? this.visualEncoding?.lines : pointMarkConfig;
    const title = this._resolveTooltipTitle(datum, tooltipMarkConfig, fallbackTitle);
    const preferredOrder = isSeriesHover
      ? [xField, yField, groupField, colorField, sizeField]
      : [yField, colorField, sizeField];
    const excludeKeys = isSeriesHover ? [] : [xField];
    const lines = this._buildTooltipLines(datum, {
      preferredOrder,
      excludeKeys,
      markConfig: tooltipMarkConfig
    });

    this._showTooltip({ title, lines }, x, y, {
      className: "tooltip line-tooltip",
      offsetX: 12,
      offsetY: -12,
      delayMs: 80
    });
  }

  _onOut(payload = {}) {
    if (payload.mark && payload.mark !== "point" && payload.mark !== "series") return;
    this._hideTooltip("tooltip line-tooltip");
  }
}

if (!customElements.get(VIS_TYPES.VENUS_LINECHART)) {
  customElements.define(VIS_TYPES.VENUS_LINECHART, VenusLineChart);
}
