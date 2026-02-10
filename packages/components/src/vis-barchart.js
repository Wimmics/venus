import { createRenderer } from "@wimmics/kgnovis-d3renderer";
import { createEncodingManager, createVisualArtifacts } from "@wimmics/kgnovis-encoding";
import { createSparqlMapper } from "@wimmics/kgnovis-mappers";
import { createLogger, VIS_TYPES } from "@wimmics/kgnovis-core";
import { buildBarChart } from "@wimmics/kgnovis-datasource";
import { createLegends, positionLegends } from "@wimmics/kgnovis-legends";

export class VisBarChart extends HTMLElement {
  static get observedAttributes() {
    return ["width", "height", "endpoint", "proxy-url"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.logger = createLogger("VisBarChart", { debug: false });
    this.width = 800;
    this.height = 500;

    this.rows = [];
    this.sparqlData = null;
    this.currentEndpoint = null;
    this.currentProxyUrl = null;

    this.mapper = createSparqlMapper(VIS_TYPES.BAR_CHART);
    this.encodingManager = createEncodingManager(VIS_TYPES.BAR_CHART);
    this.visualEncoding = this.encodingManager.getDefaultEncoding();
    this._visualArtifacts = { scales: new Map(), channels: [], legends: [] };
    this._legends = [];

    this.internalData = new WeakMap();
    this.internalData.set(this, {});

    this.renderer = null;
    this._initDOMStructure();
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "width") {
      this.width = parseInt(newValue, 10) || 800;
      this.render();
      return;
    }
    if (name === "height") {
      this.height = parseInt(newValue, 10) || 500;
      this.render();
      return;
    }
    if (name === "endpoint") {
      this.currentEndpoint = newValue || null;
      return;
    }
    if (name === "proxy-url") {
      this.currentProxyUrl = newValue || null;
    }
  }

  set sparqlQuery(query) {
    const data = this.internalData.get(this) || {};
    data.sparqlQuery = query;
    this.internalData.set(this, data);
  }
  get sparqlQuery() {
    return this.internalData.get(this)?.sparqlQuery;
  }

  set sparqlEndpoint(endpoint) {
    const data = this.internalData.get(this) || {};
    data.sparqlEndpoint = endpoint;
    this.internalData.set(this, data);
  }
  get sparqlEndpoint() {
    return this.internalData.get(this)?.sparqlEndpoint;
  }

  set sparqlResult(jsonData) {
    const data = this.internalData.get(this) || {};
    data.sparqlResult = jsonData;
    this.internalData.set(this, data);
  }
  get sparqlResult() {
    return this.internalData.get(this)?.sparqlResult;
  }

  set encoding(mapping) {
    const data = this.internalData.get(this) || {};
    data.encoding = mapping;
    this.internalData.set(this, data);
    this.setEncoding(mapping);
  }
  get encoding() {
    return this.internalData.get(this)?.encoding;
  }

  set proxy(url) {
    const data = this.internalData.get(this) || {};
    data.proxy = url;
    this.internalData.set(this, data);
  }
  get proxy() {
    return this.internalData.get(this)?.proxy;
  }

  getEncoding() {
    return JSON.parse(JSON.stringify(this.visualEncoding));
  }

  async launch() {
    const result = await buildBarChart({
      endpoint: this._resolveEndpoint(),
      query: this.sparqlQuery,
      jsonData: this.sparqlResult,
      proxyUrl: this._resolveProxyUrl(),
      encoding: this.visualEncoding,
      encodingManager: this.encodingManager
    });

    if (result.status !== "success") {
      this._notify(result.message || "Failed to build bar chart", "error");
      this.logger.error("buildBarChart failed", result);
      return;
    }

    const { chart, meta } = result;
    this.rows = chart.rows || [];
    this.sparqlData = result.raw;

    if (meta?.encodingUsed) {
      this.visualEncoding = meta.encodingUsed;
      this._populateDomains();
    } else if (meta?.usedAdaptiveEncoding) {
      this.visualEncoding = this.encodingManager.createAdaptiveEncoding(meta.vars);
      this._populateDomains();
    }

    this.render();
  }

  setEncoding(encoding) {
    try {
      this.visualEncoding = this.encodingManager.deriveEncoding(
        encoding,
        this.sparqlData?.head?.vars,
        this.sparqlData
      );
    } catch (error) {
      this._notify(error.message, "error");
      return;
    }

    if (this.rows?.length) {
      this._populateDomains();
    }
    this.render();
  }

  render() {
    const container = this.shadowRoot?.querySelector(".chart-container");
    if (container) {
      container.style.background = this._resolveBackgroundColor();
    }

    if (!this.renderer) return;
    this._compileVisualArtifacts();
    this.renderer.render({ rows: this.rows }, this.visualEncoding, this._visualArtifacts);
    this._manageLegends();
  }

  _manageLegends() {
    const container = this.shadowRoot.querySelector(".chart-container");
    if (!container) return;

    this._destroyLegends();

    const legendConfig = {
      legendItems: this._visualArtifacts?.legends || [],
      datasets: { rows: this.rows },
      getScaleById: (scaleId) => this._visualArtifacts?.scales?.get(scaleId) || null
    };

    const newLegends = createLegends(legendConfig);
    const relayoutLegends = () => {
      positionLegends(container, this._legends, {
        position: "bottom",
        spacing: 20,
        gap: 20,
        stackGap: 12
      });
    };

    newLegends.forEach((legend) => {
      legend.addEventListener("legendtoggle", () => {
        requestAnimationFrame(() => relayoutLegends());
      });
      container.appendChild(legend);
      this._legends.push(legend);
    });

    relayoutLegends();
  }

  _destroyLegends() {
    this._legends.forEach((legend) => legend.remove());
    this._legends = [];
  }

  _compileVisualArtifacts() {
    if (!this.rows?.length) {
      this._visualArtifacts = { scales: new Map(), channels: [], legends: [] };
      return;
    }

    try {
      this._visualArtifacts = createVisualArtifacts(VIS_TYPES.BAR_CHART, {
        encodingManager: this.encodingManager,
        encoding: this.visualEncoding,
        rows: this.rows
      });
    } catch (error) {
      this.logger.warn("Failed to compile visual artifacts", { message: error?.message });
      this._visualArtifacts = { scales: new Map(), channels: [], legends: [] };
    }
  }

  _populateDomains() {
    if (!this.rows?.length) return;
    this.encodingManager.clearScaleCache();
    this.visualEncoding = this.encodingManager.populateDomainsFromData(this.visualEncoding, this.rows);
  }

  _resolveBackgroundColor() {
    const background = this.visualEncoding?.background;
    if (typeof background === "string" && background.trim()) return background;
    if (background && typeof background.value === "string" && background.value.trim()) {
      return background.value;
    }
    return "#ffffff";
  }

  _notify(message, type = "info") {
    const old = this.shadowRoot.querySelector(".notification");
    if (old) old.remove();

    const container = this.shadowRoot.querySelector(".chart-container");
    if (!container) return;

    const n = document.createElement("div");
    n.className = `notification ${type}`;
    n.textContent = message;
    container.appendChild(n);

    setTimeout(() => {
      n.classList.add("fade-out");
      setTimeout(() => n.remove(), 500);
    }, 2500);
  }

  _resolveEndpoint() {
    return (
      this.currentEndpoint ||
      this.sparqlEndpoint ||
      this.getAttribute("endpoint") ||
      "https://dbpedia.org/sparql"
    );
  }

  _resolveProxyUrl() {
    return this.currentProxyUrl || this.proxy || this.getAttribute("proxy-url") || null;
  }

  _initDOMStructure() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: Arial, sans-serif; }
        .chart-container {
          width: ${this.width}px;
          height: ${this.height}px;
          background: #ffffff;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        svg { width: 100%; height: 100%; }
        .plot-area text {
          fill: #333;
          font-size: 11px;
        }
        .plot-area .domain,
        .plot-area .tick line {
          stroke: #cfcfcf;
        }
        .notification {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 40;
          transition: opacity 0.5s;
          font-size: 12px;
        }
        .notification.info { background: #e3f2fd; border: 1px solid #2196f3; }
        .notification.error { background: #ffebee; border: 1px solid #f44336; }
        .notification.fade-out { opacity: 0; }
      </style>
      <div class="chart-container">
        <svg></svg>
      </div>
    `;

    const container = this.shadowRoot.querySelector(".chart-container");
    if (container && !this.renderer) {
      this.renderer = createRenderer(VIS_TYPES.BAR_CHART, {
        container,
        encodingManager: this.encodingManager,
        width: this.width,
        height: this.height,
        logger: this.logger
      });
    }
  }
}

customElements.define("vis-barchart", VisBarChart);
