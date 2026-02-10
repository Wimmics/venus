import { createLogger } from "@wimmics/kgnovis-core";
import { createVisualArtifacts } from "@wimmics/kgnovis-encoding";
import { createLegends, positionLegends } from "@wimmics/kgnovis-legends";

export class VisBase extends HTMLElement {
  static get observedAttributes() {
    return ["width", "height", "endpoint", "proxy-url"];
  }

  constructor({ componentName, visType, defaultWidth = 800, defaultHeight = 600 } = {}) {
    super();
    this.attachShadow({ mode: "open" });

    this.visType = visType;
    this.logger = createLogger(componentName || "VisBase", { debug: false });
    this.width = defaultWidth;
    this.height = defaultHeight;

    this.currentEndpoint = null;
    this.currentProxyUrl = null;
    this.sparqlData = null;

    this.internalData = new WeakMap();
    this.internalData.set(this, {});

    this._legends = [];
    this._visualArtifacts = { scales: new Map(), channels: [], legends: [] };
    this.renderer = null;
    this.tooltipTimeout = null;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "width") {
      this.width = parseInt(newValue, 10) || this.width;
      this.render();
      return;
    }
    if (name === "height") {
      this.height = parseInt(newValue, 10) || this.height;
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
    const result = await this._buildVisualization({
      endpoint: this._resolveEndpoint(),
      query: this.sparqlQuery,
      jsonData: this.sparqlResult,
      proxyUrl: this._resolveProxyUrl(),
      encoding: this.visualEncoding,
      encodingManager: this.encodingManager
    });

    if (result.status !== "success") {
      this._notify(result.message || this._getBuildErrorMessage(), "error");
      this.logger.error(this._getBuildErrorLogKey(), result);
      return;
    }

    this._setDataFromBuildResult(result);
    this.sparqlData = result.raw;

    const meta = result.meta || {};
    if (meta.encodingUsed) {
      this.visualEncoding = meta.encodingUsed;
      this._populateDomains();
    } else if (meta.usedAdaptiveEncoding) {
      this.visualEncoding = this._createAdaptiveEncoding(meta);
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

    if (this._hasData()) {
      this._populateDomains();
    }
    this.render();
  }

  render() {
    const container = this._getContainerElement();
    if (container) {
      container.style.background = this._resolveBackgroundColor();
    }

    if (!this.renderer) return;
    this._compileVisualArtifacts();
    this.renderer.render(this._getRenderPayload(), this.visualEncoding, this._visualArtifacts);
    this._manageLegends();
  }

  _manageLegends() {
    const container = this._getContainerElement();
    if (!container) return;

    this._destroyLegends();

    const legendConfig = {
      legendItems: this._visualArtifacts?.legends || [],
      datasets: this._getLegendDatasets(),
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
    if (!this._hasData()) {
      this._visualArtifacts = { scales: new Map(), channels: [], legends: [] };
      return;
    }

    try {
      this._visualArtifacts = createVisualArtifacts(this.visType, {
        encodingManager: this.encodingManager,
        encoding: this.visualEncoding,
        ...this._getArtifactPayload()
      });
    } catch (error) {
      this.logger.warn("Failed to compile visual artifacts", { message: error?.message });
      this._visualArtifacts = { scales: new Map(), channels: [], legends: [] };
    }
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

    const container = this._getContainerElement();
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

  _showTooltip(content, x, y, options = {}) {
    const {
      className = "tooltip",
      offsetX = 12,
      offsetY = -12,
      delayMs = 0,
      dark = false,
      whiteSpace = "normal",
      maxWidth = 320
    } = options;

    this._hideTooltip(className);
    if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);

    const render = () => {
      const container = this._getContainerElement();
      if (!container) return;

      const tooltip = document.createElement("div");
      tooltip.className = `${className}${dark ? " dark" : ""}`;
      tooltip.style.whiteSpace = whiteSpace;
      tooltip.style.maxWidth = `${maxWidth}px`;

      if (typeof content === "string") {
        tooltip.textContent = content;
      } else if (content && typeof content === "object") {
        if (content.title) {
          const title = document.createElement("div");
          title.style.fontWeight = "bold";
          title.style.marginBottom = "6px";
          title.textContent = String(content.title);
          tooltip.appendChild(title);
        }

        const lines = Array.isArray(content.lines) ? content.lines : [];
        for (const line of lines) {
          const row = document.createElement("div");
          row.textContent = String(line);
          tooltip.appendChild(row);
        }
      }

      tooltip.style.left = `${x + offsetX}px`;
      tooltip.style.top = `${y + offsetY}px`;
      container.appendChild(tooltip);
    };

    if (delayMs > 0) {
      this.tooltipTimeout = setTimeout(render, delayMs);
      return;
    }
    render();
  }

  _hideTooltip(className = "tooltip") {
    if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
    const tooltip = this.shadowRoot.querySelector(`.${className.split(" ").join(".")}`);
    if (tooltip) tooltip.remove();
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

  _createAdaptiveEncoding(meta) {
    return this.encodingManager.createAdaptiveEncoding(...this._getAdaptiveEncodingArgs(meta));
  }

  _getAdaptiveEncodingArgs(meta) {
    return [meta?.vars];
  }

  _getBuildErrorMessage() {
    return "Failed to build visualization";
  }

  _getBuildErrorLogKey() {
    return "build failed";
  }

  _buildVisualization() {
    throw new Error("_buildVisualization must be implemented by subclass");
  }

  _setDataFromBuildResult() {
    throw new Error("_setDataFromBuildResult must be implemented by subclass");
  }

  _populateDomains() {
    throw new Error("_populateDomains must be implemented by subclass");
  }

  _hasData() {
    throw new Error("_hasData must be implemented by subclass");
  }

  _getRenderPayload() {
    throw new Error("_getRenderPayload must be implemented by subclass");
  }

  _getLegendDatasets() {
    throw new Error("_getLegendDatasets must be implemented by subclass");
  }

  _getArtifactPayload() {
    throw new Error("_getArtifactPayload must be implemented by subclass");
  }

  _renderBaseDOM({ containerClass = "vis-container", extraStyles = "" } = {}) {
    this._containerClassName = containerClass;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: Arial, sans-serif; }
        .${containerClass} {
          width: ${this.width}px;
          height: ${this.height}px;
          background: #ffffff;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        svg { width: 100%; height: 100%; }
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
        .tooltip {
          position: absolute;
          background: #ffffff;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px 10px;
          pointer-events: none;
          z-index: 20;
          box-shadow: 0 2px 6px rgba(0,0,0,0.18);
          font-size: 12px;
          color: #222;
        }
        .tooltip.dark {
          background: rgba(0,0,0,0.82);
          border-color: transparent;
          color: #fff;
          box-shadow: none;
        }
        ${extraStyles}
      </style>
      <div class="${containerClass}">
        <svg></svg>
      </div>
    `;
  }

  _getContainerElement() {
    const className = this._containerClassName || "vis-container";
    return this.shadowRoot?.querySelector(`.${className}`);
  }
}
