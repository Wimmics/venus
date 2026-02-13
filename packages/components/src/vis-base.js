import { createLogger } from "@wimmics/kgnovis-core";
import { createVisualArtifacts } from "@wimmics/kgnovis-encoding";
import { createLegends, positionLegends } from "@wimmics/kgnovis-legends";

export class VisBase extends HTMLElement {
  static get observedAttributes() {
    return ["width", "height", "resize"];
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
    this.resizeObserver = null;
    this.resizeRaf = null;
    this._lastObservedSize = { width: 0, height: 0 };
    this.resizeEnabled = true;
  }

  connectedCallback() {
    this._applyDimensions();
    this.resizeEnabled = this._parseBooleanAttributeValue(this.getAttribute("resize"), true);
    this._applyResizeBehavior();
    this.render();
  }

  disconnectedCallback() {
    this._stopResizeObserver();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "width") {
      this.width = this._normalizeDimensionValue(newValue, this.width);
      this._applyDimensions();
      this.render();
      return;
    }
    if (name === "height") {
      this.height = this._normalizeDimensionValue(newValue, this.height);
      this._applyDimensions();
      this.render();
      return;
    }
    if (name === "resize") {
      this.resizeEnabled = this._parseBooleanAttributeValue(newValue, true);
      this._applyResizeBehavior();
      this.render();
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
      this._applyDimensions();
      container.style.background = this._resolveBackgroundColor();
      this._updateTitle(container);
    }

    if (!this.renderer) return;
    this._syncRendererSizeFromContainer(container);
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
      const topInset = this._getLegendTopInset(container);
      positionLegends(container, this._legends, {
        position: "bottom",
        spacing: 20,
        gap: 20,
        stackGap: 12,
        topInset
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

  _resolveTitleText() {
    const title = this.visualEncoding?.title;
    if (typeof title === "string" && title.trim()) return title.trim();
    return null;
  }

  _getLegendTopInset(container) {
    const titleElement = container?.querySelector(".vis-title");
    if (!titleElement || titleElement.style.display === "none") return 0;
    return Math.max(0, Math.round(titleElement.getBoundingClientRect().height));
  }

  _updateTitle(container) {
    const titleElement = container?.querySelector(".vis-title");
    if (!titleElement) return;
    const title = this._resolveTitleText();
    if (title) {
      titleElement.textContent = title;
      titleElement.style.display = "block";
      return;
    }
    titleElement.textContent = "";
    titleElement.style.display = "none";
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
          width: 100%;
          height: 100%;
          background: #ffffff;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .vis-title {
          display: none;
          flex: 0 0 auto;
          padding: 10px 12px 0 12px;
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.25;
          color: #222;
        }
        .vis-surface {
          flex: 1 1 auto;
          min-height: 0;
          position: relative;
        }
        svg { width: 100%; height: 100%; display: block; }
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
        <div class="vis-title"></div>
        <div class="vis-surface">
          <svg></svg>
        </div>
      </div>
    `;
    this._applyDimensions();
  }

  _getContainerElement() {
    const className = this._containerClassName || "vis-container";
    return this.shadowRoot?.querySelector(`.${className}`);
  }

  _normalizeDimensionValue(nextValue, fallbackValue) {
    if (nextValue == null) return fallbackValue;
    const normalized = String(nextValue).trim();
    return normalized || fallbackValue;
  }

  _toCssDimension(value, fallbackPx) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return `${value}px`;
    }

    const text = String(value ?? "").trim();
    if (!text) return `${fallbackPx}px`;
    if (/^\d+(\.\d+)?$/.test(text)) return `${text}px`;
    return text;
  }

  _applyDimensions() {
    const cssWidth = this._toCssDimension(this.width, 800);
    const cssHeight = this._toCssDimension(this.height, 600);

    this.style.width = cssWidth;
    this.style.height = cssHeight;
  }

  _parseBooleanAttributeValue(value, defaultValue = true) {
    if (value == null) return defaultValue;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
    return true;
  }

  _applyResizeBehavior() {
    if (this.resizeEnabled) {
      this._startResizeObserver();
      return;
    }
    this._stopResizeObserver();
  }

  _syncRendererSizeFromContainer(container) {
    if (!container || !this.renderer) return;
    const surface = container.querySelector(".vis-surface") || container;
    const bounds = surface.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));

    this.renderer.width = width;
    this.renderer.height = height;
  }

  _startResizeObserver() {
    if (typeof ResizeObserver === "undefined" || this.resizeObserver) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries?.[0];
      if (!entry) return;

      const box = entry.contentRect;
      const width = Math.round(box.width || 0);
      const height = Math.round(box.height || 0);

      if (width <= 0 || height <= 0) return;
      if (width === this._lastObservedSize.width && height === this._lastObservedSize.height) return;

      this._lastObservedSize = { width, height };

      if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = requestAnimationFrame(() => {
        this.resizeRaf = null;
        this.render();
      });
    });

    this.resizeObserver.observe(this);
  }

  _stopResizeObserver() {
    if (this.resizeRaf) {
      cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = null;
    }
    if (!this.resizeObserver) return;
    this.resizeObserver.disconnect();
    this.resizeObserver = null;
  }
}
