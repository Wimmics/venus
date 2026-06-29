
import { fetchVisData } from "@wimmics/venus-import";
import { LegendManager } from "../../visual-mapping";
import { emptyVisualArtifacts, createVisualArtifactsCompiler } from "../../visual-mapping";


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
		
		this._visualArtifacts = emptyVisualArtifacts()
		this.renderer = null;
		
		this.resizeObserver = null;
		this.resizeRaf = null;
		this._lastObservedSize = { width: 0, height: 0 };
		this.resizeEnabled = true;

		this.mapper = null // instantiated by subclass
		this.tooltipManager = null // instantiated by subclass
		this.encodingManager = null // instantiated by subclass

		this._loading = false;
	}
	
	connectedCallback() {
		this._applyDimensions();
		this.resizeEnabled = this._parseBooleanAttributeValue(this.getAttribute("resize"), true);
		this._applyResizeBehavior();

		this.legendManager = new LegendManager({ container: this._getContainerElement() }) // Init legend manager after container was created

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

		this._loading = true;
		this._showLoading();

		let fetchResult;
		try {
			fetchResult = await fetchVisData({
				endpoint: this._resolveEndpoint(),
				query: this.sparqlQuery,
				jsonData: this.sparqlResult,
				proxyUrl: this._resolveProxyUrl()
			});

			if (fetchResult.status !== "success") {
				throw new Error(fetchResult.message || "Failed to fetch visualization data");
			}

			const raw = fetchResult.raw;

			console.log("fetched data = ", raw)

			if (raw?.head?.vars)
				this.encodingManager.validateReferencedFields(this.visualEncoding, raw.head.vars);

			const mapped = this.mapper.map(raw, { encoding: this.visualEncoding })

			console.log("mapped data = ", mapped)

			this._setDataFromBuildResult(mapped);
			this.sparqlData = raw;

			this.render();
		} finally {
			this._loading = false;
			this._hideLoading();
		}
	}
	
	setEncoding(encoding) {
		this.encodingManager.validateEncoding(encoding) // If anything goes wrong here an error will be thrown

		this.visualEncoding = this.encodingManager.mergeEncoding(encoding) // If encoding is valid, we merge it with the defaults to cover optional fields
		console.log('final encoding = ', this.visualEncoding)

		this._visualArtifacts = emptyVisualArtifacts()
		this.legendManager?.destroyLegends()

		if (this.sparqlData) {
			const mapped = this.mapper.map(this.sparqlData, { encoding: this.visualEncoding})

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

		// hide any previous empty message
		this._hideEmptyMessage();

		if (!this.renderer) return;

		this._syncRendererSizeFromContainer(container);

		// If there's no data after mapping/transformation, show a message and skip rendering
		if (!this._hasData()) {
			this._hideLoading();
			this._showEmptyMessage('No data to display');
			return;
		}

		this._compileVisualArtifacts();

		this.renderer.render(
			this._getRenderPayload(),
			this._visualArtifacts
		);

		this.legendManager?.createLegends({ data: this._getData(), visualArtifacts: this._visualArtifacts })
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
		this.legendManager?.destroyLegends()
		this._resetDataState();
	}

	_resetVisualizationState(options) {
		const keepEncoding = options && options.keepEncoding !== undefined
			? options.keepEncoding
			: true;

		this.sparqlData = null;
		this._visualArtifacts = emptyVisualArtifacts();

		this.legendManager?.destroyLegends()
		this.tooltipManager.hideTooltip();

		this.renderer.destroy()

		if (!keepEncoding) {
			this.visualEncoding = null;
		}

		this._resetDataState();
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
			
				.vis-loading {
			position: absolute;
			inset: 0;
			display: none;
			align-items: center;
			justify-content: center;
			background: rgba(255,255,255,0.85);
			z-index: 60;
		}
		.vis-loading.visible { display: flex; }
		.vis-loading .spinner {
			width: 40px;
			height: 40px;
			border: 4px solid rgba(0,0,0,0.08);
			border-top-color: rgba(0,0,0,0.6);
			border-radius: 50%;
			animation: vis-spin 1s linear infinite;
		}
		@keyframes vis-spin { to { transform: rotate(360deg); } }
				.vis-empty {
					position: absolute;
					inset: 0;
					display: none;
					align-items: center;
					justify-content: center;
					background: rgba(255,255,255,0.95);
					z-index: 55;
					color: #666;
					font-size: 14px;
					text-align: center;
					padding: 12px;
				}
				.vis-empty.visible { display: flex; }
        ${extraStyles}
      </style>
      <div class="vis-container">
        <div class="vis-title"></div>
				<div class="vis-surface">
					<svg></svg>
				</div>
				<div class="vis-loading"><div class="spinner"></div></div>
				<div class="vis-empty"><div class="vis-empty-message"></div></div>
				<div class="tooltip"></div>
      </div>
    `;
		this._applyDimensions();
	}
	
	_getContainerElement() {
		return this.shadowRoot?.querySelector('.vis-container');
	}

	_showLoading() {
		const el = this.shadowRoot?.querySelector('.vis-loading');
		if (!el) return;
		el.classList.add('visible');
	}

	_hideLoading() {
		const el = this.shadowRoot?.querySelector('.vis-loading');
		if (!el) return;
		el.classList.remove('visible');
	}

	_showEmptyMessage(text) {
		const el = this.shadowRoot?.querySelector('.vis-empty');
		const msg = this.shadowRoot?.querySelector('.vis-empty-message');
		if (!el || !msg) return;
		msg.textContent = text || 'No data available';
		el.classList.add('visible');
	}

	_hideEmptyMessage() {
		const el = this.shadowRoot?.querySelector('.vis-empty');
		if (!el) return;
		el.classList.remove('visible');
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
