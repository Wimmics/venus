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
    this._minimized = !this._minimized;
    this.render();
  }

  _getLegendTitle() {
    return this._encoding?.legend?.title || this._encoding?.label || this._encoding?.field || "Legend";
  }

  _getSampleValues(count = 3) {
    if (!this._encoding?.scale?.domain) return [];

    const domain = this._encoding.scale.domain;
    const range = this._encoding.scale.range || [8, 25];

    const samples = [];
    const step = Math.max(1, Math.floor(domain.length / count));

    for (let i = 0; i < domain.length && samples.length < count; i += step) {
      const value = domain[i];
      let size;

      if (this._d3Scale) {
        size = this._d3Scale(value);
      } else {
        const ratio = i / (domain.length - 1 || 1);
        size = range[0] + (range[1] - range[0]) * ratio;
      }

      samples.push({ value, size: typeof size === 'number' ? size : 10 });
    }

    return samples;
  }

  render() {
    if (!this._encoding?.field || !this._encoding?.scale) return;

    const samples = this._getSampleValues(3);
    const title = this._getLegendTitle();

    const items = samples.map(sample => {
      const diameter = sample.size * 2;
      return `
        <div class="legend-item">
          <div class="size-circle" style="width: ${diameter}px; height: ${diameter}px;"></div>
          <span class="label">${String(sample.value).substring(0, 20)}</span>
        </div>
      `;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
          font-size: 12px;
        }
        .legend-container {
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          min-width: 180px;
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
          margin-bottom: 6px;
          gap: 12px;
        }
        .size-circle {
          background: #69b3a2;
          border: 1px solid #fff;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .label {
          color: #666;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
      <div class="legend-container">
        <div class="legend-header">
          <div class="legend-title">${title}</div>
          <button class="legend-toggle" type="button" aria-label="${this._minimized ? 'Expand legend' : 'Minimize legend'}">${this._minimized ? '+' : '-'}</button>
        </div>
        <div class="legend-content" style="display: ${this._minimized ? 'none' : 'block'};">
          ${items}
        </div>
      </div>
    `;

    const toggleButton = this.shadowRoot.querySelector('.legend-toggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => this._toggleMinimized());
    }
  }
}

customElements.define('legend-size', SizeLegend);
