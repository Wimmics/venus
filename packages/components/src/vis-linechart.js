import { createRenderer } from "@wimmics/venus-d3renderer";
import { createEncodingManager } from "@wimmics/venus-encoding";
import { VIS_TYPES } from "@wimmics/venus-core";
import { buildLineChart } from "@wimmics/venus-datasource";
import { VisBase } from "./vis-base.js";

export class VisLineChart extends VisBase {
  constructor() {
    super({
      componentName: "VisLineChart",
      visType: VIS_TYPES.LINE_CHART,
      defaultWidth: 800,
      defaultHeight: 500
    });

    this.rows = [];
    this.encodingManager = createEncodingManager(VIS_TYPES.LINE_CHART);
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
    return "Failed to build line chart";
  }

  _getBuildErrorLogKey() {
    return "buildLineChart failed";
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
      this.renderer = createRenderer(VIS_TYPES.LINE_CHART, {
        container,
        encodingManager: this.encodingManager,
        width: this.width,
        height: this.height,
        logger: this.logger,
        callbacks: {
          onPointHover: (datum, x, y) => this._onPointHover(datum, x, y),
          onPointOut: () => this._onPointOut()
        }
      });
    }
  }

  _onPointHover(datum, x, y) {
    const xField = this.visualEncoding?.x?.field;
    const yField = this.visualEncoding?.y?.field;
    const colorField = this.visualEncoding?.lines?.color?.field;
    const sizeField = this.visualEncoding?.lines?.size?.field;
    const title = xField ? datum?.[xField] : "Point";
    const yValue = yField ? datum?.[yField] : undefined;
    const lines = [];

    if (yField) {
      const numeric = Number(yValue);
      lines.push(`${yField}: ${Number.isFinite(numeric) ? numeric.toLocaleString() : String(yValue)}`);
    }
    if (colorField && datum?.[colorField] !== undefined) {
      lines.push(`${colorField}: ${String(datum[colorField])}`);
    }
    if (sizeField && datum?.[sizeField] !== undefined) {
      lines.push(`${sizeField}: ${String(datum[sizeField])}`);
    }

    this._showTooltip({ title, lines }, x, y, {
      className: "tooltip line-tooltip",
      offsetX: 12,
      offsetY: -12,
      delayMs: 80
    });
  }

  _onPointOut() {
    this._hideTooltip("tooltip line-tooltip");
  }
}

if (!customElements.get("venus-linechart")) {
  customElements.define("venus-linechart", VisLineChart);
}
