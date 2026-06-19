import {
	sankey,
	sankeyCenter,
	sankeyJustify,
	sankeyLeft,
	sankeyLinkHorizontal,
	sankeyRight
} from "d3-sankey";
import BaseRenderer from "./base-renderer.js";
import { MARK_TYPES } from "@wimmics/venus-core";

export class SankeyRenderer extends BaseRenderer {
    /**
	 * Initialize graph-specific rendering state and interaction handles.
	 */
	constructor(opts = {}) {
		super(opts);
		this.simulation = null;
		this.nodeGroups = null;
		this.linkGroups = null;
		
		this.zoomBehavior = null;
		
		this.nodes = [];
		this.links = [];
	}
	
	/**
	 * Return the renderer payload shape used for rerenders and resize updates.
	 */
	_defaultPayload() {
		return { nodes: this.nodes, links: this.links };
	}
	
	/**
	 * Store incoming graph data on the renderer instance.
	 */
	_ingestRenderPayload(payload = { nodes: [], links: [] }) {
		this.nodes = payload?.nodes || [];
		this.links = payload?.links || [];
	}

	_renderVis() {
		this.nodes = (this.nodes || []).filter((node) => node && node.id != null);
		this.links = (this.links || []).filter(
			(link) => link && link.source != null && link.target != null && Number(link.value ?? link.weight ?? 1) > 0
		);

		if (!this.nodes.length || !this.links.length) {
			this._renderCenteredMessage(this._state.width, this._state.height, "No data to visualize");
			return false;
		}

		this._retrieveMarkChannels({ marks: [MARK_TYPES.NODES, MARK_TYPES.LINKS] });
		this._retrieveMarkAttributes({ marks: [MARK_TYPES.NODES, MARK_TYPES.LINKS] });

		const sankeyLayout = this.visualArtifacts?.layout?.sankey || {};
		const linksLayout = this.visualArtifacts?.layout?.links || {};

		const align = this._resolveAlign(sankeyLayout.align);
		const nodeWidth = Number.isFinite(sankeyLayout.nodeWidth) && sankeyLayout.nodeWidth > 0
			? sankeyLayout.nodeWidth
			: 15;
		const nodePadding = Number.isFinite(sankeyLayout.nodePadding) && sankeyLayout.nodePadding >= 0
			? sankeyLayout.nodePadding
			: 10;
		const linkOpacity = Number.isFinite(linksLayout.opacity)
			? Math.max(0, Math.min(1, linksLayout.opacity))
			: 0.35;

		const margin = { top: 16, right: 16, bottom: 16, left: 16 };
		const innerWidth = Math.max(1, this._state.width - margin.left - margin.right);
		const innerHeight = Math.max(1, this._state.height - margin.top - margin.bottom);

		const graphGroup = this.chartGroup
			.append("g")
			.attr("class", "sankey")
			.attr("transform", `translate(${margin.left},${margin.top})`);

		const graph = sankey()
			.nodeId((d) => d.id)
			.nodeAlign(align)
			.nodeWidth(nodeWidth)
			.nodePadding(nodePadding)
			.extent([[0, 0], [innerWidth, innerHeight]])({
				nodes: this.nodes.map((d) => ({ ...d })),
				links: this.links.map((d) => ({
					...d,
					value: Number(d.value ?? d.weight ?? 1)
				}))
			});

		this.linkGroups = graphGroup
			.append("g")
			.attr("class", "links")
			.selectAll("path")
			.data(graph.links)
			.enter()
			.append("path")
			.attr("d", sankeyLinkHorizontal())
			.attr("fill", "none")
			.attr("stroke", (d) => this._getMarkColor(d, MARK_TYPES.LINKS) || "#999999")
			.attr("stroke-opacity", linkOpacity)
			.attr("stroke-width", (d) => Math.max(1, d.width || 1));

		this.nodeGroups = graphGroup
			.append("g")
			.attr("class", "nodes")
			.selectAll("g")
			.data(graph.nodes)
			.enter()
			.append("g")
			.attr("class", "node");

		this.nodeGroups
			.append("rect")
			.attr("x", (d) => d.x0)
			.attr("y", (d) => d.y0)
			.attr("height", (d) => Math.max(1, d.y1 - d.y0))
			.attr("width", (d) => Math.max(1, d.x1 - d.x0))
			.attr("fill", (d) => this._getMarkColor(d, MARK_TYPES.NODES) || "#69b3a2")
			.attr("stroke", (d) => this._getMarkStroke(d, MARK_TYPES.NODES) || "#ffffff")
			.attr("stroke-width", (d) => this._getMarkStrokeWidth(d, MARK_TYPES.NODES) || 1);

		this.nodeLabels = graphGroup
			.append("g")
			.attr("class", "node-labels")
			.selectAll("text")
			.data(graph.nodes.filter((d) => this._displayLabel(d, MARK_TYPES.NODES)))
			.enter()
			.append("text")
			.attr("x", (d) => (d.x0 < innerWidth / 2 ? d.x1 + 6 : d.x0 - 6))
			.attr("y", (d) => (d.y0 + d.y1) / 2)
			.attr("dy", "0.35em")
			.attr("text-anchor", (d) => (d.x0 < innerWidth / 2 ? "start" : "end"))
			.text((d) => this._getLabelText(d));

		this.linkLabels = graphGroup
			.append("g")
			.attr("class", "link-labels")
			.selectAll("text")
			.data(graph.links.filter((d) => this._displayLabel(d, MARK_TYPES.LINKS)))
			.enter()
			.append("text")
			.attr("x", (d) => (d.source.x1 + d.target.x0) / 2)
			.attr("y", (d) => (d.y0 + d.y1) / 2)
			.attr("text-anchor", "middle")
			.attr("dy", "0.35em")
			.style("font-size", "10px")
			.style("fill", "#555")
			.text((d) => this._getLabelText(d));

		this._setNodeEvents();
		this._setLinkEvents();

		return true;
	}

	_resolveAlign(align) {
		switch (String(align || "justify").toLowerCase()) {
			case "left":
				return sankeyLeft;
			case "right":
				return sankeyRight;
			case "center":
				return sankeyCenter;
			default:
				return sankeyJustify;
		}
	}

	_setNodeEvents() {
		this.nodeGroups
			.on("mouseover", (event, d) => {
				this.callbacks.onHover?.({
					mark: MARK_TYPES.NODES,
					datum: d,
					x: event.offsetX,
					y: event.offsetY,
					event
				});
			})
			.on("mouseout", () => {
				this.callbacks.onOut?.();
			});
	}

	_setLinkEvents() {
		this.linkGroups
			.on("mouseover", (event, d) => {
				this.callbacks.onHover?.({
					mark: MARK_TYPES.LINKS,
					datum: d,
					x: event.offsetX,
					y: event.offsetY,
					event
				});
			})
			.on("mouseout", () => {
				this.callbacks.onOut?.();
			});
	}
}