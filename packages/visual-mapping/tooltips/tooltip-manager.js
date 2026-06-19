import * as d3 from "d3"

export class TooltipManager {

    constructor(opts = {}) {
		this.chartShadowRoot = opts.shadowRoot

		this.tooltipTimeout = null;

		this.enabled;	

		this.excludeKeys = [ "id", "x", "y", "vx", "vy", "fx", "fy", "px", "py", "index",
			"sourceLinks", "targetLinks", "roles", "__meta", "__x", "source", "target"] // rendering information, excluded from tooltip 
    }

	showTooltip(payload){
		const { datum, x, y, mark} = payload

		const { dataFields, metricFields } = this._getContent(datum)
		const title = this._getTitle(datum, mark)
		this._renderTooltip({ title, dataFields, metricFields }, x, y);
	}

	hideTooltip() {
		// if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
		d3.select(this.chartShadowRoot).select('.vis-container')
			.select('.tooltip').style('display', 'none')
	}

	updateTooltipState({ enabled }) {
		this.enabled = enabled !== false
	}

	updateEncoding(encoding) {
		this.visualEncoding = encoding
	}

	// Helpers

	_renderTooltip(content, x, y) {

		const container = d3.select(this.chartShadowRoot).select('.vis-container')

		if (!container) return;

		const tooltip = container.select(".tooltip")
			.style("display", "block")
		
		tooltip.selectAll("*").remove()
		
		const title = tooltip.append("div")
			.attr("class", "tooltip-title");

		title.selectAll("span")
			.data(content.title.filter(Boolean))
			.enter()
			.append("span")
			.attr("class", (_, i) =>
				i === 0
				? "tooltip-title-main"
				: "tooltip-title-subtitle"
			)
			.text(d => d);

		this._renderTooltipTable(tooltip, "Data", content.dataFields);
		this._renderTooltipTable(tooltip, "Metrics", content.metricFields);

		this._positionTooltip({x, y, offset: 12})

	}

	_renderTooltipTable(tooltip, title, rows = []) {
		if (!Array.isArray(rows) || rows.length === 0) return;

		tooltip.append("div")
			.attr("class", "tooltip-section-title")
			.text(title);

		const table = tooltip.append("table")
			.attr("class", "tooltip-table");

		const tr = table.selectAll("tr")
			.data(rows)
			.enter()
			.append("tr");

		tr.append("td")
			.attr("class", "tooltip-key")
			.text(d => d.key);

		tr.append("td")
			.attr("class", "tooltip-value")
			.text(d => d.value);
	}

	_positionTooltip({ x, y, offset = 12 }) {
		const container = d3.select(this.chartShadowRoot).select(".vis-container");
		if (container.empty()) return;

		const tooltip = container.select(".tooltip");
		if (tooltip.empty()) return;

		const containerNode = container.node();
		const tooltipNode = tooltip.node();

		const cw = containerNode.clientWidth;
		const ch = containerNode.clientHeight;
		const tw = tooltipNode.offsetWidth;
		const th = tooltipNode.offsetHeight;

		let yOffset = offset * 3;
		let left = x + offset;
		let top = y + yOffset;

		// flip horizontally if overflowing right
		if (left + tw > cw) {
			left = x - tw - offset;
		}

		// flip vertically if overflowing bottom
		if (top + th > ch) {
			top = y - th - yOffset;
		}

		// final safety clamp
		left = Math.max(offset, Math.min(left, cw - tw - offset));
		top = Math.max(offset, Math.min(top, ch - th - yOffset));

		tooltip
			.style("left", `${left}px`)
			.style("top", `${top}px`);
	}
	
	_resolveTooltipFields(datum) {
		if (!datum || typeof datum !== "object") return [];
		if (!this.enabled) return [];
		
		const metricFields = Object.keys(datum).filter(d => this.metricKeys?.includes(d))
		const dataFields = datum.tooltipData && typeof datum.tooltipData === "object" ? Object.keys(datum.tooltipData) : []

		return { metricFields, dataFields }
	}
	
	_resolveTooltipTitle(datum, markConfig, fallback = null) {
		const titleConfig = markConfig?.tooltip?.title;
		if (typeof titleConfig === "string") return titleConfig;
		
		const titleField = titleConfig?.field
		
		if ( titleField && titleField.length && datum[titleField] ) 
			return datum[titleField]
		
		return fallback;
	}
	
	_isTooltipEnabled() {
		return this.enabled
	}

	// Basic implementation of getContent; subclass override if needed according to chart's data format
	_getContent(datum) {

        const fields = { dataFields: [] }

		const data = datum.tooltipData || datum

        for (let field of Object.keys(data)) {
            fields.dataFields.push({
                key: field,
                value: data[field]
            })
        }
        
        return fields
    }

	

	// Basic implementation of _getTitle; it works mostly with cartesian charts; it needs to be overriden by subclass depending on the chart's data format
	_getTitle(datum, mark) {
        const xField = this.visualEncoding?.x?.field;
        const yField = this.visualEncoding?.y?.field;

        const groupField = this.visualEncoding?.[mark]?.groups?.field;
		const colorField = this.visualEncoding?.[mark]?.color?.field;
        
        const fallback = xField && yField ? `(${datum?.[xField]}, ${datum?.[yField]})` : (xField ? datum?.[xField] : mark)
        const title = this._resolveTooltipTitle(
			datum,
			this.visualEncoding?.[mark],
			fallback
		);

        const categoryField = colorField ?? groupField 
        const subtitle = categoryField ? `${categoryField}: ${ datum?.[categoryField] }` : null
        
        return [ title, subtitle ].filter(Boolean)
    }

	

}