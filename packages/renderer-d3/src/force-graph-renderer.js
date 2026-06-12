import * as d3 from "d3";
import BaseRenderer from "./base-renderer.js";

import { ATTRIBUTE_TYPES, CHANNEL_TYPES, MARK_DEFAULTS, MARK_TYPES } from "@wimmics/venus-core";

export default class ForceGraphRenderer extends BaseRenderer {
	constructor(opts = {}) {
		super(opts);
		this.simulation = null;
		this.nodeGroups = null;
		this.linkGroups = null;
		
		this.zoomBehavior = null;
		
		this.nodes = [];
		this.links = [];
	}
	
	_defaultPayload() {
		return { nodes: this.nodes, links: this.links };
	}
	
	_ingestRenderPayload(payload = { nodes: [], links: [] }) {
		this.nodes = payload?.nodes || [];
		this.links = payload?.links || [];
	}
	
	_validateState() {
		if (!this.nodes?.length) return "No data to visualize";
		return null;
	}
	
	_renderVis() {
		
		// Define arrow heads for directional links
		this.svg.append("defs")
			.append("marker")
			.attr("id", "arrowhead")
			.attr("viewBox", "0 -5 10 10")
			.attr("refX", 10)
			.attr("refY", 0)
			.attr("markerWidth", 6)
			.attr("markerHeight", 6)
			.attr("orient", "auto")
			.append("path")
			.attr("d", "M0,-5L10,0L0,5")
			.attr("fill", "#999");
		
		this.nodes = this.nodes.filter((n) => n && n.id != null);
		this.links = (this.links || []).filter((l) => l && l.source != null && l.target != null);
		
		if (!this.nodes.length) {
			this._renderCenteredMessage(this._state.width, this._state.height, "No data to visualize");
			return false;
		}
		
		this.interactions = this._state?.encoding?.interactions || {};
		this.interactions.enabled = this.interactions.enabled !== false;
		this.interactions.drag = this.interactions.enabled && this.interactions.drag !== false;
		this.interactions.zoom = this.interactions.enabled && this.interactions.zoom !== false;

		this._retrieveMarkChannels({ marks: [MARK_TYPES.NODES, MARK_TYPES.LINKS], roles: { "nodes": ["source", "target"]} })
		
		this._retrieveMarkAttributes({ marks: [MARK_TYPES.NODES, MARK_TYPES.LINKS], roles: { "nodes": ["source", "target"]} })
		
		this._drawLinks()
		this._drawNodes()
		this._setInitialLabelsOpacity()

		// Handle interactive behavior
		this._setSimulation()
		this._setZoomBehavior();
		this._setDragAndDrop()
		
		return true;
	}

	_drawLinks(){
		// Draw links
		this.linkGroups = this.chartGroup
			.append("g")
			.attr("class", "links")
			.selectAll("g")
			.data(this.links)
			.enter()
				.append("g")
			
		this.linkGroups
			.append("line")
			.attr("class", d => d.type || "directional") // Important for styling according to link type (cf. css)
			.attr("stroke", (d) => this._getMarkColor(d, MARK_TYPES.LINKS))
			.attr("stroke-width", (d) => this._getMarkSize(d, MARK_TYPES.LINKS))

		this.linkLabels = this.linkGroups
			.filter((d) => this._displayLabel(d, "links"))
			.append("g")
			.attr("class", "link-label")

		this.linkLabels.append("rect")
			.attr("class", "link-label-bg")
			.attr("rx", 2)
			.attr("ry", 2)
			.attr("fill", "white")
			.attr("fill-opacity", 0.8)

		this.linkLabels.append("text")
			.attr("text-anchor", "middle")
			.attr("dominant-baseline", "middle")
			.style("pointer-events", "none")
			.style("font-size", "10px")
			.style("fill", "#555")
			.text((d) => d.label || d.relation || d.type || "")

		this.linkLabels.each(function () {
			const g = d3.select(this);
			const text = g.select("text").node();
			if (!text) return;

			const bbox = text.getBBox();
			const padding = 2;

			g.select("rect")
				.attr("x", bbox.x - padding)
				.attr("y", bbox.y - padding)
				.attr("width", bbox.width + padding * 2)
				.attr("height", bbox.height + padding * 2);
		});

		this._setLinkEvents()
	}

	_drawNodes() {
		// Create nodes group
		this.nodeGroups = this.chartGroup
			.append("g")
			.attr("class", "nodes")
			.selectAll("g")
			.data(this.nodes)
			.enter()
				.append("g")
		
		// Draw nodes
		this.nodeGroups
			.append("circle")
			.attr("r", (d) => this._getMarkSize(d, MARK_TYPES.NODES))
			.attr("fill", (d) => this._getMarkColor(d, MARK_TYPES.NODES) )
			.attr("stroke", (d) => this._getMarkStroke(d, MARK_TYPES.NODES))
			.attr("stroke-width", (d) => this._getMarkStrokeWidth(d, MARK_TYPES.NODES));

		// Handle labels display based on zoom and user-provided encoding
		this.nodeLabels = this.nodeGroups
			.filter((d) => this._displayLabel(d, "nodes"))
			.append("text")
			.attr("class", "node-label")
			.text((d) => d.label || d.id)

		this._setNodeEvents()
	}

	_setInitialLabelsOpacity(){

		const initialZoom = this.interactions.zoom ? d3.zoomTransform(this.svg.node()).k : 1;

		this.nodeLabels.style("opacity", (d) => this._computeLabelOpacity(d, MARK_TYPES.NODES, initialZoom));

		this.linkLabels.style("opacity", (d) => this._computeLabelOpacity(d, MARK_TYPES.LINKS, initialZoom));
	}

	// Visual helpers
	_computeLabelOpacity(d, mark, zoomK) {
		const interpolate = (value, min, max) => {
			if (value <= min) return 0;
			if (value >= max) return 1;
			return (value - min) / (max - min);
		};

		if (!this._displayLabel(d, mark)) return 0;

		const zoomOpacity = interpolate(zoomK, 0.45, 0.95);

		if (mark === "nodes") {
			const renderedRadius = this._getMarkSize(d, MARK_TYPES.NODES) * zoomK;
			const sizeOpacity = interpolate(renderedRadius, 3, 7);
			return Math.min(zoomOpacity, sizeOpacity);
		}

		if (mark === "links") {
			const length = this._getLinkLength(d);
			const renderedLength = length * zoomK;
			const lengthOpacity = interpolate(renderedLength, 35, 90);
			return Math.min(zoomOpacity, lengthOpacity);
		}

		return zoomOpacity;
	}

	_getLinkLength(link) {
		const source = link?.source;
		const target = link?.target;

		if (
			!source || !target ||
			!Number.isFinite(source.x) ||
			!Number.isFinite(source.y) ||
			!Number.isFinite(target.x) ||
			!Number.isFinite(target.y)
		) {
			return 0;
		}

		const dx = target.x - source.x;
		const dy = target.y - source.y;

		return Math.sqrt(dx * dx + dy * dy);
	}

	_getLinkLabelPosition(link) {
		const source = link.source;
		const target = link.target;

		if (
			!source || !target ||
			Number.isNaN(source.x) || Number.isNaN(source.y) ||
			Number.isNaN(target.x) || Number.isNaN(target.y)
		) {
			return { x: 0, y: 0, angle: 0 };
		}

		const x = (source.x + target.x) / 2;
		const y = (source.y + target.y) / 2;

		const dx = target.x - source.x;
		const dy = target.y - source.y;

		let angle = Math.atan2(dy, dx) * 180 / Math.PI;

		// keep label readable, not upside down
		if (angle > 90 || angle < -90) {
			angle += 180;
		}

		return { x, y, angle };
	}

	_getLinkDistance() {
		return this._resolveAttribute({ mark: MARK_TYPES.LINKS, attribute: ATTRIBUTE_TYPES.DISTANCE })?.value
	}
		
	// Event helpers
	_setZoomBehavior() {
		if (this.interactions.zoom) {
			this.zoomBehavior = d3
				.zoom()
				.scaleExtent([0.1, 8])
				.on("zoom", (event) => {
					this.chartGroup.attr("transform", event.transform);	
					// Update labels' opacity according to zoom level
					this.nodeLabels.style("opacity", (d) => this._computeLabelOpacity(d, MARK_TYPES.NODES, event.transform.k));
					this.linkLabels.style("opacity", (d) => this._computeLabelOpacity(d, MARK_TYPES.LINKS, event.transform.k));
				});
			this.svg.call(this.zoomBehavior);
		} else {
			this.svg.on(".zoom", null);
			this.zoomBehavior = null;
			this.chartGroup.attr("transform", null);
		}
	}

	_setLinkEvents() {
		this.linkGroups.on("mouseover", (event, d) => {
			this._focusMark({ mark: MARK_TYPES.LINKS, activeDatum: d })
			this.callbacks.onHover?.({
				mark: "link",
				datum: d,
				x: event.offsetX,
				y: event.offsetY,
				event
			})
		})
		.on("mouseout", () => {
			this._resetFocusMark()
			this.callbacks.onOut?.({ mark: "link" })
		})
	}

	_setNodeEvents() {
		this.nodeGroups.on("mouseover", (event, d) => {
			this._focusMark({ mark: MARK_TYPES.NODES, activeDatum: d });
			this.callbacks.onHover?.({
				mark: "node",
				datum: d,
				x: event.offsetX,
				y: event.offsetY,
				event
			});
		})
		.on("mouseout", () => {
			this._resetFocusMark();
			this.callbacks.onOut?.({ mark: "node" });
		})
		.on("contextmenu", (event, d) => {
			event.preventDefault();
			this.callbacks.onContextMenu?.({
				mark: "node",
				datum: d,
				x: event.offsetX,
				y: event.offsetY,
				event
			});
		})
		.on("click", (event, d) => this.callbacks.onClick?.({
			mark: "node",
			datum: d,
			x: event.offsetX,
			y: event.offsetY,
			event
		}));
	}

	_setDragAndDrop() {
		if (!this.interactions.drag) return

		this.nodeGroups.call(
			d3.drag()
			.on("start", (event, d) => dragstarted(event, d, this.simulation))
			.on("drag", (event, d) => dragged(event, d))
			.on("end", (event, d) => dragended(event, d, this.simulation))
		);

		function dragstarted(event, d, sim) {
			if (!event.active) sim.alphaTarget(0.3).restart();
			d.fx = d.x;
			d.fy = d.y;
		}
		
		function dragged(event, d) {
			d.fx = event.x;
			d.fy = event.y;
		}
		
		function dragended(event, d, sim) {
			if (!event.active) sim.alphaTarget(0);
			d.fx = null;
			d.fy = null;
		}
	}
	
	_focusMark({ mark, activeDatum } = {}) {
		if (!activeDatum) return;

		if (mark === MARK_TYPES.NODES){
			const activeNodeId = activeDatum.id;

			const relatedLinks = this.links.filter((link) =>
				link.source.id === activeNodeId || link.target.id === activeNodeId
			);

			const relatedNodeIds = new Set(
				relatedLinks.flatMap((link) => [link.source.id, link.target.id])
			);

			this.nodeGroups?.classed(
				"node-downplayed",
				(node) => !relatedNodeIds.has(node.id) )

			this.linkGroups?.classed(
				"link-downplayed",
				(link) => link.source.id !== activeNodeId && link.target.id !== activeNodeId )

			return
		}

		if (mark === MARK_TYPES.LINKS){
			const sourceId = activeDatum.source?.id ?? activeDatum.source;
			const targetId = activeDatum.target?.id ?? activeDatum.target;
			const relatedNodeIds = new Set([sourceId, targetId]);

			this.nodeGroups?.classed(
				"node-downplayed",
				(node) => !relatedNodeIds.has(node.id)
			);

			this.linkGroups?.classed(
				"link-downplayed",
				(link) => link !== activeDatum
			);

			return
		}
	}
	
	_resetFocusMark() {
		this.nodeGroups?.classed("node-downplayed", false);
  		this.linkGroups?.classed("link-downplayed", false);
	}

	// Graph placement helpers

	_setSimulation() {
		this.simulation = d3
			.forceSimulation(this.nodes)
			.force("link", d3.forceLink(this.links).id((d) => d.id).distance(() => this._getLinkDistance()))
			.force("charge", d3.forceManyBody().strength(-200))
			.force("center", d3.forceCenter(this._state.width / 2, this._state.height / 2))
			.force("collision", d3.forceCollide().radius((d) => this._getMarkSize(d, MARK_TYPES.NODES) + 5))
			.force("x", d3.forceX(this._state.width / 2).strength(0.1))
			.force("y", d3.forceY(this._state.height / 2).strength(0.1));

		const getLabelPlacement = (d) => {
			const centerX = this._state.width / 2;
			const centerY = this._state.height / 2;
			const nodeX = Number.isNaN(d?.x) ? centerX : d.x;
			const nodeY = Number.isNaN(d?.y) ? centerY : d.y;
			const dx = nodeX - centerX;
			const dy = nodeY - centerY;
			const offset = this._getMarkSize(d, MARK_TYPES.NODES) + 8;
			
			if (Math.abs(dx) >= Math.abs(dy)) {
				if (dx >= 0) {
					return { x: offset, y: 0, anchor: "start", baseline: "middle" };
				}
				return { x: -offset, y: 0, anchor: "end", baseline: "middle" };
			}
			
			if (dy < 0) {
				return { x: 0, y: -offset, anchor: "middle", baseline: "auto" };
			}
			return { x: 0, y: offset, anchor: "middle", baseline: "hanging" };
		};

		const calculateLinkPosition = (lnk) => {
			const source = lnk.source;
			const target = lnk.target;
			if (Number.isNaN(source.x) || Number.isNaN(source.y) || Number.isNaN(target.x) || Number.isNaN(target.y)) {
				return { x1: 0, y1: 0, x2: 0, y2: 0 };
			}
			
			const dx = target.x - source.x;
			const dy = target.y - source.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist === 0) return { x1: source.x, y1: source.y, x2: target.x, y2: target.y };
			
			const sr = this._getMarkSize(source, MARK_TYPES.NODES);
			const tr = this._getMarkSize(target, MARK_TYPES.NODES);
			
			const ux = dx / dist;
			const uy = dy / dist;
			
			return {
				x1: source.x + ux * sr,
				y1: source.y + uy * sr,
				x2: target.x - ux * tr,
				y2: target.y - uy * tr
			};
		};
		

		const constrainNode = (d) => {
			const r = this._getMarkSize(d, MARK_TYPES.NODES);
			d.x = Math.max(r, Math.min(this._state.width - r, d.x));
			d.y = Math.max(r, Math.min(this._state.height - r, d.y));
		};

		let hasAppliedInitialFit = false;
		this.simulation.on("tick", () => {
			if (!this.interactions.zoom) {
				this.nodeGroups.each(constrainNode);
			}

			if (!this.linkGroups) return
			
			this.linkGroups.each(function (d) {
				const p = calculateLinkPosition(d);
				d3.select(this)
					.selectAll('line')
					.attr("x1", p.x1)
					.attr("y1", p.y1)
					.attr("x2", p.x2)
					.attr("y2", p.y2);
			});

			
			this.linkLabels
				.attr("x", (d) => this._getLinkLabelPosition(d).x)
				.attr("y", (d) => this._getLinkLabelPosition(d).y)
				.attr("transform", (d) => {
					const p = this._getLinkLabelPosition(d);
					return `rotate(${p.angle},${p.x},${p.y})`;
				});


			this.linkLabels.attr("transform", (d) => {
				const p = this._getLinkLabelPosition(d);
				return `translate(${p.x},${p.y}) rotate(${p.angle})`;
			});
			
			
			this.nodeGroups.attr("transform", (d) => {
				const x = Number.isNaN(d.x) ? this._state.width / 2 : d.x;
				const y = Number.isNaN(d.y) ? this._state.height / 2 : d.y;
				return `translate(${x},${y})`;
			});
			
			
			this.nodeLabels.each(function (d) {
				const placement = getLabelPlacement(d);
				d3.select(this)
				.attr("x", placement.x)
				.attr("y", placement.y)
				.style("text-anchor", placement.anchor)
				.style("dominant-baseline", placement.baseline);
			});
			
			
			if (this.interactions.zoom && !hasAppliedInitialFit && this.simulation.alpha() < 0.8) {
				this._applyInitialZoomFit();
				hasAppliedInitialFit = true;
			}
		});

		this.simulation.on("end", () => {
			if (this.interactions.zoom && !hasAppliedInitialFit) {
				this._applyInitialZoomFit();
				hasAppliedInitialFit = true;
			}
		});
	}

	_applyInitialZoomFit() {
		if (!this.interactions.zoom || !this.zoomBehavior) return;

		const computeNodeBounds = () => {
			let minX = Infinity;
			let minY = Infinity;
			let maxX = -Infinity;
			let maxY = -Infinity;
			
			for (const node of this.nodes) {
				const x = Number.isNaN(node?.x) ? this._state.width / 2 : node.x;
				const y = Number.isNaN(node?.y) ? this._state.height / 2 : node.y;
				const r = this._getMarkSize(node, MARK_TYPES.NODES);
				minX = Math.min(minX, x - r);
				minY = Math.min(minY, y - r);
				maxX = Math.max(maxX, x + r);
				maxY = Math.max(maxY, y + r);
			}
			
			if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
				return null;
			}
			
			return { minX, minY, maxX, maxY };
		};

		const bounds = computeNodeBounds();
		if (!bounds) return;
		
		const padding = 30;
		const graphWidth = Math.max(1, bounds.maxX - bounds.minX);
		const graphHeight = Math.max(1, bounds.maxY - bounds.minY);
		const centerX = (bounds.minX + bounds.maxX) / 2;
		const centerY = (bounds.minY + bounds.maxY) / 2;
		const scale = Math.min(
			this._state.width / (graphWidth + padding * 2),
			this._state.height / (graphHeight + padding * 2),
			1
		);
		
		const transform = d3.zoomIdentity
			.translate(this._state.width / 2, this._state.height / 2)
			.scale(scale)
			.translate(-centerX, -centerY);
		
		this.svg.call(this.zoomBehavior.transform, transform);
	};

	resize(width, height) {
		this.width = width || this.width;
		this.height = height || this.height;
		if (this.simulation) {
			this.simulation.force("center", d3.forceCenter(this.width / 2, this.height / 2));
			this.simulation.alpha(0.3).restart();
		}
	}
	
	destroy() {
		try {
			if (this.simulation) {
				this.simulation.stop();
				this.simulation = null;
			}
		} catch {
			// ignore
		}
		
		if (this.svg) {
			this.svg.on(".zoom", null);
		}
		
		this.nodeGroups = null;
		this.linkGroups = null;
		this.chartGroup = null;
		this.zoomBehavior = null;
		
		super.destroy();
	}
}
