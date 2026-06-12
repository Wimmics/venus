import * as d3 from "d3";
import BaseRenderer from "./base-renderer.js";

export default class CartesianChartRenderer extends BaseRenderer {
	constructor(opts = {}) {
		super(opts);
		this.data = [];
	}
	
	_defaultPayload() {
		return { rows: this.data };
	}
	
	_ingestRenderPayload(payload = { rows: [] }) {
		this.data = Array.isArray(payload?.rows) ? payload.rows : [];
	}
	

	_getMarginBase() {
		return { top: 20, right: 20, bottom: 50, left: 60 };
	}

	_prepareRenderState() {
		const margin = this.visualArtifacts?.layout?.margin || this._getMarginBase()

		this.chartGroup.attr("transform", `translate(${margin.left},${margin.top})`);
	}

	_renderAxes({ layout }) {
		const { innerHeight, axes } = layout;
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
			.style("text-anchor", "end")
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
	
	destroy() {
		super.destroy();
	}

}
