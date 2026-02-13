/**
 * ColorLegend - Displays a legend for color-encoded data
 * Properties:
 * - encoding: Color encoding configuration { field, scale: { domain, range } }
 * - data: Array of data objects
 * - d3Scale: Optional D3 scale function for accurate color mapping
 */
export class ColorLegend extends HTMLElement {
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
    return this._encoding?.legend?.title || this._encoding?.field || "Legend";
  }

  _getNumericDomainBounds() {
    const scaleBounds = this._d3Scale?.__kgnovisBounds;
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

  render() {
    if (!this._encoding?.field || !this._encoding?.scale) return;
    const isCompact = this._encoding?.legend?.compact !== false;
    if (!isCompact) this._minimized = false;

    const domain = this._encoding.scale.domain || [];
    const range = this._encoding.scale.range || [];
    const title = this._getLegendTitle();
    let items = "";
    let moreInfo = "";

    if (this._d3Scale && typeof this._d3Scale.invertExtent === "function" && typeof this._d3Scale.range === "function") {
      const bins = this._d3Scale.range();
      const thresholds = typeof this._d3Scale.domain === "function" ? this._d3Scale.domain() : [];
      const bounds = this._getNumericDomainBounds();
      const maxShown = 10;
      items = bins.slice(0, maxShown).map((color, index) => {
        const lower = index === 0 ? bounds.min : thresholds[index - 1];
        const upper = index === bins.length - 1 ? bounds.max : thresholds[index];
        return `
          <div class="legend-item">
            <div class="color-box" style="background-color: ${color};"></div>
            <span class="label">${this._formatIntervalLabel(lower, upper, { includeLower: true, includeUpper: index === bins.length - 1 })}</span>
          </div>
        `;
      }).join("");
      moreInfo = bins.length > maxShown ? `<div class="more-info">+${bins.length - maxShown} more bins</div>` : "";
    } else {
      items = domain.slice(0, 10).map((value, i) => {
        let color = '#999';
        if (this._d3Scale && typeof this._d3Scale === 'function') {
          color = this._d3Scale(value);
        } else if (range[i]) {
          color = range[i];
        }
        return `
          <div class="legend-item">
            <div class="color-box" style="background-color: ${color};"></div>
            <span class="label">${String(value).substring(0, 30)}</span>
          </div>
        `;
      }).join('');
      moreInfo = domain.length > 10 ? `<div class="more-info">+${domain.length - 10} more</div>` : '';
    }

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
          display: flex;
          align-items: center;
          margin-bottom: 4px;
          gap: 8px;
        }
        .color-box {
          width: 16px;
          height: 16px;
          border: 1px solid #ccc;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .label {
          display: block;
          color: #666;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .more-info {
          color: #999;
          font-style: italic;
          margin-top: 4px;
          font-size: 11px;
        }
      </style>
      <div class="legend-container">
        <div class="legend-header">
          <div class="legend-title">${title}</div>
          ${
            isCompact
              ? `<button class="legend-toggle" type="button" aria-label="${this._minimized ? 'Expand legend' : 'Minimize legend'}">${this._minimized ? '+' : '-'}</button>`
              : ""
          }
        </div>
        <div class="legend-content" style="display: ${this._minimized ? 'none' : 'block'};">
          ${items}
          ${moreInfo}
        </div>
      </div>
    `;

    const toggleButton = isCompact ? this.shadowRoot.querySelector('.legend-toggle') : null;
    if (toggleButton) {
      toggleButton.addEventListener('click', () => this._toggleMinimized());
    }
  }
}

customElements.define('legend-color', ColorLegend);
