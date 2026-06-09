import * as d3 from "d3";
import BaseRenderer from "./base-renderer.js";
import {
	computeAxisAwareMargins,
	measurePlotOverflow,
	shouldRefitLayout,
	growMargins
} from "./utils/layout-fit.js";

export default class CartesianChartRenderer extends BaseRenderer {
	constructor(opts = {}) {
		super(opts);
		this.data = [];
		this._fitPass = 0;
		this._marginOverride = null;
	}
	
	_defaultPayload() {
		return { rows: this.data };
	}
	
	_ingestRenderPayload(payload = { rows: [] }) {
		this.data = Array.isArray(payload?.rows) ? payload.rows : [];
	}
	
	
	_onValidationFailed() {
		this._resetFitState();
	}
	

	_getMarginBase() {
		return { top: 20, right: 20, bottom: 50, left: 60 };
	}

	_prepareRenderState() {
		const margin = this.visualArtifacts?.layout?.margin || this._getMarginBase()

		this.chartGroup.attr("transform", `translate(${margin.left},${margin.top})`);
	}

	_renderAxes({ layout }) {
		const { innerWidth, innerHeight, axes } = layout;
		const bottomAxis = axes.bottom
		const leftAxis = axes.left

		// ----- bottom axis -------
		this.chartGroup
			.append("g")
			.attr("class", "x-axis")
			.attr("transform", `translate(0,${innerHeight})`)
			.call(bottomAxis.generator)
			.selectAll("text")
			.style("text-anchor", bottomAxis.labelAngle ? "end" : "middle")
			.attr("transform", this._axisLabelTransform(bottomAxis))

		const bottomTitlePos = bottomAxis.titlePosition
		this.chartGroup
			.append("text")
			.attr("class", "axis-title axis-title-x")
			.attr("x", bottomTitlePos.x)
			.attr("y", bottomTitlePos.y)
			.attr("text-anchor", "middle")
			.style("fill", "#333")
			.style("font-size", "12px")
			.text(bottomAxis.title);

		// ------ left axis -------
		this.chartGroup
			.append("g")
			.attr("class", "y-axis")
			.call(leftAxis.generator)
			.selectAll("text")
			.style("text-anchor", leftAxis.labelAngle ? "end" : "middle")
			.attr("transform", this._axisLabelTransform(leftAxis))
				
		const leftTitlePos = leftAxis.titlePosition
		this.chartGroup
			.append("text")
			.attr("class", "axis-title axis-title-y")
			.attr("transform", `translate(${leftTitlePos.x},${leftTitlePos.y}) rotate(${leftTitlePos.rotate})`)
			.attr("text-anchor", "middle")
			.style("fill", "#333")
			.style("font-size", "12px")
			.text(leftAxis.title);
	}

	_axisLabelTransform(axis) {
		const offset = axis?.labelOffset || { x: 0, y: 0 };
		const angle = Number(axis?.labelAngle || 0);

		return angle
			? `translate(${offset.x},${offset.y}) rotate(${angle})`
			: `translate(${offset.x},${offset.y})`;
	}
	

	
	// _normalizeTickFormatName(formatName) {
	// 	return typeof formatName === "string" ? formatName.toLowerCase().trim() : "";
	// }
	
	// _buildTickFormatter(formatName, opts = {}) {
	// 	const key = this._normalizeTickFormatName(formatName);
	// 	const fallback = opts.fallback || "number";
	// 	if (fallback === "string" && (!key || key === "raw")) return (value) => String(value);
	// 	if (!key || key === "raw") return (value) => d3.format(",")(value);
	// 	if (key === "percent" || key === "percentage") return (value) => d3.format(".0%")(value);
	// 	if (key === "compact") {
	// 		const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
	// 		return (value) => compact.format(value);
	// 	}
	// 	if (key === "kmb") {
	// 		return (value) => {
	// 			const num = Number(value);
	// 			if (!Number.isFinite(num)) return String(value);
	// 			const abs = Math.abs(num);
	// 			if (abs >= 1e12) return `${d3.format(".2~f")(num / 1e12)}T`;
	// 			if (abs >= 1e9) return `${d3.format(".2~f")(num / 1e9)}B`;
	// 			if (abs >= 1e6) return `${d3.format(".2~f")(num / 1e6)}M`;
	// 			if (abs >= 1e3) return `${d3.format(".2~f")(num / 1e3)}k`;
	// 			return d3.format(".2~f")(num);
	// 		};
	// 	}
	// 	if (key === "k" || key === "thousands") return (value) => `${d3.format(".2~f")(Number(value) / 1e3)}k`;
	// 	if (key === "m" || key === "millions") return (value) => `${d3.format(".2~f")(Number(value) / 1e6)}M`;
	// 	if (key === "b" || key === "billions") return (value) => `${d3.format(".2~f")(Number(value) / 1e9)}B`;
	// 	if (key === "integer" || key === "int") return (value) => d3.format(",d")(Math.round(Number(value) || 0));
	// 	return (value) => d3.format(",")(value);
	// }
	
	destroy() {
		super.destroy();
	}
}
