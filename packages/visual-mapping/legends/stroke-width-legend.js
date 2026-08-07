import * as d3 from "d3";

/**
* StrokeWidthLegend - Displays a legend for stroke-width-encoded data.
* Renders horizontal line swatches with increasing/decreasing widths.
*/
export class StrokeWidthLegend extends HTMLElement {
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
		return this._encoding?.legend?.title || this._encoding?.field || "Stroke Width Legend";
	}

	_getTemplate() {
		return `
		<style>
			:host {
				display: inline-block;
				font-family: Arial, sans-serif;
				font-size: 12px;
				max-width: 260px;
			}
			.legend-container {
				background: white;
				border: 1px solid #ddd;
				border-radius: 4px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.1);
				min-width: 180px;
				max-width: 260px;
				overflow: hidden;
				width: max-content;
				box-sizing: border-box;
			}
			.legend-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 8px;
				background: #f5f5f5;
				border-bottom: 1px solid #e6e6e6;
				padding: 6px 8px;
				box-sizing: border-box;
				max-width: 260px;
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
				box-sizing: border-box;
				max-width: 260px;
				overflow: hidden;
			}
			.legend-content svg {
				max-width: 100%;
				display: block;
			}
		</style>
		<div class="legend-container">
			<div class="legend-header">
				<div class="legend-title"></div>
			</div>
			<div class="legend-content"></div>
		</div>
		`;
	}

	_formatLabel(sample) {
		if (sample?.label != null) return String(sample.label);
		const value = Number(sample?.value);
		if (!Number.isFinite(value)) return "?";
		if (Number.isInteger(value)) return String(value);
		return String(Math.round(value * 10) / 10);
	}

	render() {
		if (!this._encoding?.field || !this._d3Scale) return;

		this.shadowRoot.innerHTML = this._getTemplate();

		const isCompact = this._encoding?.legend?.compact !== false;
		if (!isCompact) this._minimized = false;

		const root = d3.select(this.shadowRoot);
		root.select(".legend-title").html(this._getLegendTitle());

		if (isCompact) {
			root.select(".legend-header")
				.append("button")
				.classed("legend-toggle", true)
				.attr("aria-label", this._minimized ? "Expand legend" : "Minimize legend")
				.text(this._minimized ? '+' : '-')
				.on('click', () => this._toggleMinimized());
		}

		const content = root.select(".legend-content")
			.style("display", this._minimized ? "none" : "block");

		const samples = (this._encoding?.legend?.samples || [])
			.map((sample) => {
				const width = Number(sample?.value);
				return {
					...sample,
					strokeWidth: Number.isFinite(width) && width > 0 ? width : 1,
					label: this._formatLabel(sample)
				};
			});

		if (!samples.length) return;

		const rowHeight = 22;
		const width = 190;
		const height = samples.length * rowHeight;

		const svg = content.append("svg")
			.attr("width", width)
			.attr("height", height);

		const rows = svg.selectAll("g.legend-item")
			.data(samples)
			.enter()
			.append("g")
			.classed("legend-item", true)
			.attr("transform", (_, i) => `translate(0, ${i * rowHeight})`);

		const x1 = 8;
		const x2 = 88;
		const y = rowHeight / 2;

		rows.append("line")
			.attr("x1", x1)
			.attr("x2", x2)
			.attr("y1", y)
			.attr("y2", y)
			.attr("stroke", "#666")
			.attr("stroke-linecap", "round")
			.attr("stroke-width", (d) => d.strokeWidth);

		rows.append("text")
			.attr("x", 102)
			.attr("y", y)
			.attr("dominant-baseline", "middle")
			.attr("fill", "#666")
			.text((d) => d.label);
	}
}

customElements.define('legend-stroke-width', StrokeWidthLegend);