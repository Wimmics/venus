/**
* SizeLegend - Displays a legend for size-encoded data
* Properties:
* - encoding: Size encoding configuration { field, scale: { domain, range } }
* - data: Array of data objects
* - d3Scale: Optional D3 scale for more accurate size rendering
*/
export class SizeLegend extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._encoding = null;
		this._data = null;
		this._d3Scale = null;
		this._minimized = true;
	}
	
	set encoding(enc) {
		this._encoding = enc;
		this.render();
	}
	
	get encoding() {
		return this._encoding;
	}
	
	set data(d) {
		this._data = d;
		this.render();
	}
	
	get data() {
		return this._data;
	}
	
	set d3Scale(scale) {
		this._d3Scale = scale;
		this.render();
	}
	
	get d3Scale() {
		return this._d3Scale;
	}
	
	connectedCallback() {
		this.render();
	}
	
	_toggleMinimized() {
		if (this._encoding?.legend?.compact === false) return;
		this._minimized = !this._minimized;
		this.render();
		this.dispatchEvent(new CustomEvent('legendtoggle', { bubbles: true, composed: true }));
	}
	
	_getLegendTitle() {
		return this._encoding?.legend?.title || this._encoding?.field || "Size Legend";
	}
	
	_getNumericDomainBounds() {
		const scaleBounds = this._d3Scale?.__venusBounds;
		if (scaleBounds && Number.isFinite(scaleBounds.min) && Number.isFinite(scaleBounds.max)) {
			return { min: Math.min(scaleBounds.min, scaleBounds.max), max: Math.max(scaleBounds.min, scaleBounds.max) };
		}
		
		const dataValues = (Array.isArray(this._data) ? this._data : [])
		.map((item) => Number(item?.[this._encoding?.field]))
		.filter((value) => Number.isFinite(value));
		if (dataValues.length >= 2) {
			return { min: Math.min(...dataValues), max: Math.max(...dataValues) };
		}
		
		const domain = this._encoding?.scale?.domain;
		if (Array.isArray(domain) && domain.length >= 2) {
			const numeric = domain.map((value) => Number(value)).filter((value) => Number.isFinite(value));
			if (numeric.length >= 2) {
				return { min: Math.min(...numeric), max: Math.max(...numeric) };
			}
		}
		
		return { min: null, max: null };
	}
	
	_formatIntervalLabel(min, max, { includeLower = true, includeUpper = true } = {}) {
		const minTxt = min === undefined || min === null ? "?" : Number(min).toFixed(2).replace(/\.00$/, "");
		const maxTxt = max === undefined || max === null ? "?" : Number(max).toFixed(2).replace(/\.00$/, "");
		const left = includeLower ? "[" : "(";
		const right = includeUpper ? "]" : ")";
		return `${left}${minTxt}, ${maxTxt}${right}`;
	}
	
	_getSampleValues(count = 4) {
		if (!this._d3Scale || typeof this._d3Scale !== "function") return [];
		
		if (this._isThresholdLegend()) {
			return this._getThresholdSampleValues();
		}
		
		return this._getContinuousSampleValues(count);
	}
	
	_isThresholdLegend() {
		return this._encoding?.legend?.isThreshold === true;
	}
	
	_getThresholdSampleValues() {
		const rangeValues =
		typeof this._d3Scale.range === "function"
		? this._d3Scale.range()
		: [];
		
		const thresholds =
		typeof this._d3Scale.domain === "function"
		? this._d3Scale.domain()
		: [];
		
		const bounds = this._getNumericDomainBounds();
		
		return rangeValues.map((size, index) => {
			const lower = index === 0 ? bounds.min : thresholds[index - 1];
			const upper = index === rangeValues.length - 1 ? bounds.max : thresholds[index];
			
			return {
				value: this._formatIntervalLabel(lower, upper, {
					includeLower: true,
					includeUpper: index === rangeValues.length - 1
				}),
				size: Number.isFinite(size) && size > 0 ? size : 10
			};
		});
	}
	
	_getContinuousSampleValues(count = 4) {
		const domain =
		typeof this._d3Scale.domain === "function"
		? this._d3Scale.domain()
		: this._encoding?.scale?.domain || [];
		
		if (!Array.isArray(domain) || domain.length < 2) return [];
		
		const numericDomain = domain
		.map((value) => Number(value))
		.filter((value) => Number.isFinite(value));
		
		if (numericDomain.length < 2) return [];
		
		const min = Math.min(...numericDomain);
		const max = Math.max(...numericDomain);
		
		return Array.from({ length: count }, (_, index) => {
			const t = count === 1 ? 0 : index / (count - 1);
			const value = min + (max - min) * t;
			const size = this._d3Scale(value);
			
			return {
				value: this._formatNumber(value),
				size: Number.isFinite(size) && size > 0 ? size : 10
			};
		});
	}
	
	_formatNumber(value) {
		if (!Number.isFinite(value)) return "?";
		if (Number.isInteger(value)) return String(value);
		return String(Math.round(value));
	}
	
	render() {
		if (!this._encoding?.field || !this._d3Scale) return;
		const isCompact = this._encoding?.legend?.compact !== false;
		if (!isCompact) this._minimized = false;
		
		const samples = this._encoding?.legend?.samples || [];

		const items = samples.map((sample) => {
		const radius = sample.value;
		
		const diameter = radius * 2;
		const padding = 2;
		return `
			<div class="legend-item">
			<svg width="${diameter + padding * 2}" height="${diameter + padding * 2}">
				<circle cx="${radius + padding}" cy="${radius + padding}" r="${radius}"
				fill="none" stroke="#666" stroke-width="2"></circle>
			</svg>
			<span class="label">${sample.label}</span>
			</div>
		`;
		}).join("");
		
		this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          font-family: Arial, sans-serif;
          font-size: 12px;
        }
        .legend-container {
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          min-width: 180px;
          max-width: 260px;
          overflow: hidden;
        }
        .legend-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: #f5f5f5;
          border-bottom: 1px solid #e6e6e6;
          padding: 6px 8px;
        }
        .legend-title {
          font-weight: bold;
          color: #333;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .legend-toggle {
          width: 20px;
          height: 20px;
          border: 1px solid #ccc;
          background: #fff;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          color: #333;
          flex-shrink: 0;
        }
        .legend-toggle:hover {
          background: #f0f0f0;
        }
        .legend-content {
          padding: 10px 12px;
        }
        .legend-item {
          display: grid;
          grid-template-columns: 56px 1fr;
          align-items: center;
          margin-bottom: 6px;
          gap: 10px;
        }
        .size-circle {
          background: transparent;
          border: 1.5px solid #666;
          border-radius: 50%;
          box-sizing: border-box;
          justify-self: center;
        }
        .label {
          color: #666;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
      <div class="legend-container">
        <div class="legend-header">
          <div class="legend-title">${this._getLegendTitle()}</div>
          ${
		isCompact
		? `<button class="legend-toggle" type="button" aria-label="${this._minimized ? 'Expand legend' : 'Minimize legend'}">${this._minimized ? '+' : '-'}</button>`
		: ""
	}
        </div>
        <div class="legend-content" style="display: ${this._minimized ? 'none' : 'block'};">
          ${items}
        </div>
      </div>
    `;
	
	const toggleButton = isCompact ? this.shadowRoot.querySelector('.legend-toggle') : null;
	if (toggleButton) {
		toggleButton.addEventListener('click', () => this._toggleMinimized());
	}
}
}

customElements.define('legend-size', SizeLegend);
