
import { fetchVisData } from "@wimmics/venus-datasource";
import { createLegends, positionLegends } from "@wimmics/venus-legends";
import { emptyVisualArtifacts, createVisualArtifactsCompiler } from "@wimmics/venus-visual-artifacts";

import { TooltipManager } from "./tooltips/tooltip-manager";

export class VenusBase extends HTMLElement {
	static get observedAttributes() {
		return ["width", "height", "resize"];
	}
	
	constructor({ componentName, visType, defaultWidth = 800, defaultHeight = 600 } = {}) {
		super();
		this.attachShadow({ mode: "open" });
		
		this.visType = visType;
		this.width = defaultWidth;
		this.height = defaultHeight;
		
		this.currentEndpoint = null;
		this.currentProxyUrl = null;
		this.sparqlData = null;
		
		this.internalData = new WeakMap();
		this.internalData.set(this, {});
		
		this.visualArtifactsCompiler = createVisualArtifactsCompiler(this.visType);
		
		this._legends = [];
		this._visualArtifacts = emptyVisualArtifacts()
		this.renderer = null;
		
		this.resizeObserver = null;
		this.resizeRaf = null;
		this._lastObservedSize = { width: 0, height: 0 };
		this.resizeEnabled = true;

		this.mapper = null // instantiated by subclass
		this.tooltipManager = null // instantiated by subclass
		this.encodingManager = null // instantiated by subclass
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

		if (data.sparqlQuery !== query) 
			this._invalidateMappedData({ clearRaw: true });
		
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

		if (data.sparqlResult !== jsonData)
			this._invalidateMappedData({ clearRaw: true });

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
		this._resetVisualizationState({ keepEncoding: true });

		const fetchResult = await fetchVisData({
			endpoint: this._resolveEndpoint(),
			query: this.sparqlQuery,
			jsonData: this.sparqlResult,
			proxyUrl: this._resolveProxyUrl()
		});

		console.log("fetched result = ", fetchResult)
		if (fetchResult.status !== "success") {
			throw new Error(fetchResult.message || "Failed to fetch visualization data");
		}

		const raw = fetchResult.raw;

		if (raw?.head?.vars) {
			this.encodingManager.validateReferencedFields(
			this.visualEncoding,
			raw.head.vars
			);
		}

		const mapped = this.mapper.map(raw, {
			encoding: this.visualEncoding,
			encodingManager: this.encodingManager
		});

		console.log("mapped data = ", mapped)

		this._setDataFromBuildResult(mapped);
		this.sparqlData = raw;

		this.render();
	}
	
	setEncoding(encoding) {
		this.visualEncoding = this.encodingManager.validateEncoding(encoding)
		
		this._visualArtifacts = emptyVisualArtifacts()
		this._destroyLegends()

		if (this.sparqlData) {
			const mapped = this.mapper.map(this.sparqlData, { 
				encoding: this.visualEncoding,
				encodingManager: this.encodingManager
			})

			this._setDataFromBuildResult(mapped)
		}

		this.tooltipManager.updateTooltipState({ enabled : this.visualEncoding?.interactions?.tooltip })
		this.tooltipManager.updateEncoding(this.visualEncoding)

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
		
		this.renderer.render(
			this._getRenderPayload(), 
			this._visualArtifacts
		);

		this._manageLegends();
	}

	_remapFromRawResult() {
		if (!this.sparqlData) return false;

		const result = this._mapRawResult({
			raw: this.sparqlData,
			encoding: this.visualEncoding,
			encodingManager: this.encodingManager
		});

		this._setDataFromBuildResult(result);
		return true;
	}

	_mapRawResult() {
  		throw new Error("_mapRawResult must be implemented by subclass");
	}

	_invalidateMappedData(options = {}) {
		const clearRaw = options.clearRaw === true;

		if (clearRaw) {
			this.sparqlData = null;
		}

		this._visualArtifacts = emptyVisualArtifacts();
		this._destroyLegends();
		this._resetDataState();
	}

	_resetVisualizationState(options) {
		const keepEncoding = options && options.keepEncoding !== undefined
			? options.keepEncoding
			: true;

		this.sparqlData = null;
		this._visualArtifacts = emptyVisualArtifacts();

		this._destroyLegends();
		this.tooltipManager.hideTooltip();

		this.renderer.destroy()

		if (!keepEncoding) {
			this.visualEncoding = null;
		}

		this._resetDataState();
	}
	
	_manageLegends() {
		const container = this._getContainerElement();
		if (!container) return;
		
		this._destroyLegends();
		
		const legendConfig = {
			legendItems: this._visualArtifacts?.legends || [],
			datasets: this._getData(),
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
			this._applyLegendSurfaceInsets(container);
		};
		
		newLegends.forEach((legend) => {
			legend.addEventListener("legendtoggle", () => {
				requestAnimationFrame(() => relayoutLegends());
			});
			container.appendChild(legend);

			legend.render()

			this._legends.push(legend);
		});
		
		relayoutLegends();
		// Custom elements can finalize internal layout one frame later.
		// Run a deferred pass so bottom legends are centered side by side at first paint.
		requestAnimationFrame(() => relayoutLegends());
	}
	
	_destroyLegends() {
		this._legends.forEach((legend) => legend.remove());
		this._legends = [];
	}
	
	_compileVisualArtifacts() {
		
		if (!this._hasData()) {
			this._visualArtifacts = emptyVisualArtifacts()
			return;
		}
	
		this._visualArtifacts = this.visualArtifactsCompiler.build({
			encoding: this.visualEncoding,
			marks: this.encodingManager.getMarks(),
			width: this.renderer.width,
			height: this.renderer.height,
			data: this._getData(),
			chart: this._getChart()
		})
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
	
	_applyLegendSurfaceInsets(container) {
		const surface = container?.querySelector(".vis-surface");
		if (!surface) return;
		
		const reservingLegends = this._legends.filter((legend) => legend?._legendCompact === false);
		if (!reservingLegends.length) {
			surface.style.paddingTop = "0px";
			surface.style.paddingRight = "0px";
			surface.style.paddingBottom = "0px";
			surface.style.paddingLeft = "0px";
			return;
		}
		
		const surfaceRect = surface.getBoundingClientRect();
		const inset = { top: 0, right: 0, bottom: 0, left: 0 };
		const reserveGap = 8;
		
		reservingLegends.forEach((legend) => {
			const rect = legend.getBoundingClientRect();
			const position = legend?._legendPosition || "bottom";
			
			if (position === "top" || position === "top-left" || position === "top-right") {
				inset.top = Math.max(inset.top, Math.round(rect.bottom - surfaceRect.top + reserveGap));
			}
			if (position === "bottom" || position === "bottom-left" || position === "bottom-right") {
				inset.bottom = Math.max(inset.bottom, Math.round(surfaceRect.bottom - rect.top + reserveGap));
			}
			if (position === "left" || position === "top-left" || position === "bottom-left") {
				inset.left = Math.max(inset.left, Math.round(rect.right - surfaceRect.left + reserveGap));
			}
			if (position === "right" || position === "top-right" || position === "bottom-right") {
				inset.right = Math.max(inset.right, Math.round(surfaceRect.right - rect.left + reserveGap));
			}
		});
		
		const maxHorizontal = Math.max(0, Math.floor(surfaceRect.width / 2) - 1);
		const maxVertical = Math.max(0, Math.floor(surfaceRect.height / 2) - 1);
		surface.style.paddingTop = `${Math.max(0, Math.min(inset.top, maxVertical))}px`;
		surface.style.paddingRight = `${Math.max(0, Math.min(inset.right, maxHorizontal))}px`;
		surface.style.paddingBottom = `${Math.max(0, Math.min(inset.bottom, maxVertical))}px`;
		surface.style.paddingLeft = `${Math.max(0, Math.min(inset.left, maxHorizontal))}px`;
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

	_getChart() { return null }
	
	_onHover() {}
	
	_onOut() {}
	
	_onClick() {}
	
	_onContextMenu() {}
	
	_resolveEndpoint() {
		return this.currentEndpoint || this.sparqlEndpoint || "https://dbpedia.org/sparql";
	}
	
	_resolveProxyUrl() {
		return this.currentProxyUrl || this.proxy || null;
	}
	
	_setDataFromBuildResult() {
		throw new Error("_setDataFromBuildResult must be implemented by subclass");
	}
	
	_resetDataState() {
		throw new Error ("_resetDataState must be implemented by subclass")
	}

	_hasData() {
		throw new Error("_hasData must be implemented by subclass");
	}

	_getData() {
		throw new Error("_getData must be implemented by subclass");
	}
	
	_getRenderPayload() {
		throw new Error("_getRenderPayload must be implemented by subclass");
	}
	
	
	_renderBaseDOM({ extraStyles = "" } = {}) {
		this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: Arial, sans-serif; }
        .vis-container {
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
          box-sizing: border-box;
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

		.chart-group text {
          fill: #333;
          font-size: 11px;
        }
        .chart-group .domain,
        .chart-group .tick line {
          stroke: #cfcfcf;
        }

		.tooltip{
			position: absolute;
			z-index: 1000;
			display: none;
		}

		.tooltip-title {
			display: flex;
			flex-direction: column;
		}

		.tooltip-title-main {
			font-weight: 600;
		}

		.tooltip-title-subtitle {
			font-size: 0.9em;
			color: #666;
			font-style: italic;
		}

		.tooltip-section-title {
			margin-top: 5px;
			font-style: italic;
		}

		.tooltip-table {
			width: 100%;
			border-collapse: collapse;
		}

		.tooltip-table td{
			border: 1px solid #ccc;
			padding: 4px 8px;
		}

		.tooltip-key {
			font-weight: 600;
			padding-right: 8px;
			white-space: nowrap;
		}

		.tooltip-value {
			text-align: left;
		}
        ${extraStyles}
      </style>
      <div class="vis-container">
        <div class="vis-title"></div>
        <div class="vis-surface">
          <svg></svg>
        </div>
		<div class="tooltip"></div>
      </div>
    `;
		this._applyDimensions();
	}
	
	_getContainerElement() {
		return this.shadowRoot?.querySelector('.vis-container');
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
		const svg = surface.querySelector("svg");
		const bounds = (svg || surface).getBoundingClientRect();
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
