import * as d3 from "d3";
import BaseRenderer from "./base-renderer.js";

import { CHANNEL_TYPES, MARK_TYPES } from "@wimmics/venus-core";

export default class ForceGraphRenderer extends BaseRenderer {
	constructor(opts = {}) {
		super(opts);
		this.simulation = null;
		this.nodeGroup = null;
		this.linkSel = null;
		this.viewportGroup = null;
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
		console.log("[ForceGraph Renderer] visual artifacts = ", this.visualArtifacts)
		
		const defs = this.svg.append("defs")
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

		// Channels: object helper keeping previously computed channel features
		this.channels = { } 		
		for (let channel of Object.values(CHANNEL_TYPES)) {
			if (!this.channels[channel]) this.channels[channel] = {}
			for (let mark of [MARK_TYPES.NODES, MARK_TYPES.LINKS]) {
				this.channels[channel][mark] = this._getArtifactChannel(mark, channel)
			}
		}

		console.log("channels = ", this.channels)

		// this.channels.color.nodes = this._getArtifactChannel(MARK_TYPES.NODES, CHANNEL_TYPES.COLOR);
		this.channels.color.source = this._getArtifactChannel(MARK_TYPES.NODES, CHANNEL_TYPES.COLOR, "source");
		this.channels.color.target = this._getArtifactChannel(MARK_TYPES.NODES, CHANNEL_TYPES.COLOR, "target");
		
		// this.channels.size.nodes = this._getArtifactChannel(MARK_TYPES.NODES, CHANNEL_TYPES.SIZE);
		this.channels.size.source = this._getArtifactChannel(MARK_TYPES.NODES, CHANNEL_TYPES.SIZE, "source");
		this.channels.size.target = this._getArtifactChannel(MARK_TYPES.NODES, CHANNEL_TYPES.SIZE, "target");
				
		// Attributes: object helper keeping previously computed attribute features per mark
		this.attributes = { nodes: { source: {}, target: {} }, links: {} }
		this.attributes.nodes.labels = this._getArtifactAttribute( "nodes", "labels")
		this.attributes.nodes.source.labels = this._getArtifactAttribute( "nodes", "labels", "source")
		this.attributes.nodes.target.labels = this._getArtifactAttribute( "nodes", "labels", "target")

		this.attributes.links.distance = this._getArtifactAttribute("links", "distance")
		
		this.viewportGroup = this.svg.append("g").attr("class", "viewport");
		let labelSel = null;
		
		// Draw links
		this.linkSel = this.viewportGroup
			.append("g")
			.attr("class", "links")
			.selectAll("line")
			.data(this.links)
			.enter()
				.append("line")
				.attr("class", (d) => d.type || "directional")
				.attr("stroke", (d) => this._getLinkColor(d))
				.attr("stroke-width", (d) => this._getLinkWidth(d))
		
		// Create nodes group
		this.nodeGroup = this.viewportGroup
			.append("g")
			.attr("class", "nodes")
			.selectAll("g")
			.data(this.nodes)
			.enter()
				.append("g")
		
		// Draw nodes
		this.nodeGroup
			.append("circle")
			.attr("r", (d) => this._getNodeRadius(d))
			.attr("fill", (d) => this._getNodeColor(d) )
			.attr("stroke", (d) => this._getNodeStroke(d))
			.attr("stroke-width", (d) => this._getNodeStrokeWidth(d));

		// Handle labels display based on zoom and user-provided encoding
		labelSel = this.nodeGroup
			.filter((d) => this._showNodeLabels(d))
			.append("text")
			.attr("class", "node-label")
			.text((d) => d.label || d.id);
			if (labelSel) {
				const initialZoom = this.interactions.zoom ? d3.zoomTransform(this.svg.node()).k : 1;
				labelSel.style("opacity", (d) => this._computeLabelOpacity(d, initialZoom));
			}

		// Handle interactive behavior
		this._setSimulation(labelSel)
		this._setZoomBehavior(labelSel);
		this._setLinkEvents()
		this._setNodeEvents()
		this._setDragAndDrop()
		
		return true;
	}

	// Visual helpers
	_computeLabelOpacity(d, zoomK) {
		const interpolate = (value, min, max) => {
			if (value <= min) return 0;
			if (value >= max) return 1;
			return (value - min) / (max - min);
		};
		
		if (!this._showNodeLabels(d)) return 0;
		const zoomOpacity = interpolate(zoomK, 0.45, 0.95);
		const renderedRadius = this._getNodeRadius(d) * zoomK;
		const sizeOpacity = interpolate(renderedRadius, 3, 7);
		return Math.max(0, Math.min(1, Math.min(zoomOpacity, sizeOpacity)));
	}

	_resolveNodeAttribute(d, attribute) {
		const roles = Array.isArray(d?.roles) ? d.roles : [];

		if (roles.length === 1 && roles[0] === "source" && this.attributes.nodes?.source?.[attribute]) {
			return this.attributes.nodes?.source?.[attribute]
		}
		if (roles.length === 1 && roles[0] === "target" && this.attributes.nodes?.target?.[attribute]) {
			return this.attributes.nodes?.target?.[attribute]
		}
		return this.attributes.nodes?.[attribute]
	}

	_showNodeLabels(d){ return this._resolveNodeAttribute(d, "labels")?.display !== false }

	_linkDistance() { return this.attributes.links.distance?.value }
		
	

	_resolveNodeChannel(d, channel) {
		const role = Array.isArray(d?.roles) ? d.roles[0] : null;

		if (role && this.channels?.[channel]?.[role])
			return this.channels?.[channel]?.[role]

		return this.channels?.[channel]?.nodes
	}
		
	_resolveScaleValue(d, channel, validate = (value) => value) {
		const fallback = channel?.defaultValue;
		
		const field = channel?.field
		const scale = this._getArtifactScale(channel)
		
		
		if (!field || d[field] == null || !scale) {
			return fallback;
		}
		
		const value = scale(d[field]);

		return validate(value) ? value : fallback;
	}
		
	_isPositiveNumber(value) { return Number.isFinite(value) && value > 0 }
		
	_getNodeColor(d) {
		return this._resolveScaleValue(d, this._resolveNodeChannel(d, "color"))
	};
		
	_getNodeRadius(d) {
		return this._resolveScaleValue(d, this._resolveNodeChannel(d, "size"), this._isPositiveNumber)
	};
		
	_getLinkColor(d) {
		return this._resolveScaleValue(d, this.channels.color.links)
	};
		
	_getLinkWidth = (d) => {
		return this._resolveScaleValue(d, this.channels.size.links, this._isPositiveNumber)
	}

	_getNodeStroke (d) {
		return this._resolveScaleValue(d, this.channels.stroke.nodes)
	}
	
	_getNodeStrokeWidth (d) {
		return this._resolveScaleValue(d, this.channels.strokeWidth.nodes, this._isPositiveNumber)
	}

	// Event helpers
	_setZoomBehavior(labelSel) {
		if (this.interactions.zoom) {
			this.zoomBehavior = d3
				.zoom()
				.scaleExtent([0.1, 8])
				.on("zoom", (event) => {
					this.viewportGroup.attr("transform", event.transform);
					if (labelSel) {
						labelSel.style("opacity", (d) => this._computeLabelOpacity(d, event.transform.k));
					}
				});
			this.svg.call(this.zoomBehavior);
		} else {
			this.svg.on(".zoom", null);
			this.zoomBehavior = null;
			this.viewportGroup.attr("transform", null);
		}
	}

	_setLinkEvents() {
		this.linkSel.on("mouseover", (event, d) => this.callbacks.onHover?.({
			mark: "link",
			datum: d,
			x: event.offsetX,
			y: event.offsetY,
			event
		}))
		.on("mouseout", () => this.callbacks.onOut?.({ mark: "link" }));
	}

	_setNodeEvents() {
		this.nodeGroup.on("mouseover", (event, d) => {
			this._focusMark({ mark: "node", activeDatum: d });
			this.callbacks.onHover?.({
				mark: "node",
				datum: d,
				x: event.offsetX,
				y: event.offsetY,
				event
			});
		})
		.on("mouseout", () => {
			this._resetFocusMark({ mark: "node" });
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

		this.nodeGroup.call(
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
		if (mark !== "node" || !activeDatum) return;
		const connectedLinks = this.links.filter((link) => (
			link.source.id === activeDatum.id || link.target.id === activeDatum.id
		));
		const connectedNodeIds = new Set(connectedLinks.flatMap((link) => [link.source.id, link.target.id]));
		this.linkSel?.classed("link-highlighted", (link) => (
			link.source.id === activeDatum.id || link.target.id === activeDatum.id
		));
		this.nodeGroup?.classed("node-highlighted", (graphNode) => connectedNodeIds.has(graphNode.id));
	}
	
	_resetFocusMark({ mark } = {}) {
		if (mark && mark !== "node") return;
		this.linkSel?.classed("link-highlighted", false);
		this.nodeGroup?.classed("node-highlighted", false);
	}

	// Graph placement helpers

	_setSimulation(labelSel) {
		this.simulation = d3
			.forceSimulation(this.nodes)
			.force("link", d3.forceLink(this.links).id((d) => d.id).distance(() => this._linkDistance()))
			.force("charge", d3.forceManyBody().strength(-200))
			.force("center", d3.forceCenter(this._state.width / 2, this._state.height / 2))
			.force("collision", d3.forceCollide().radius((d) => this._getNodeRadius(d) + 5))
			.force("x", d3.forceX(this._state.width / 2).strength(0.1))
			.force("y", d3.forceY(this._state.height / 2).strength(0.1));

		const getLabelPlacement = (d) => {
			const centerX = this._state.width / 2;
			const centerY = this._state.height / 2;
			const nodeX = Number.isNaN(d?.x) ? centerX : d.x;
			const nodeY = Number.isNaN(d?.y) ? centerY : d.y;
			const dx = nodeX - centerX;
			const dy = nodeY - centerY;
			const offset = this._getNodeRadius(d) + 8;
			
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
			
			const sr = this._getNodeRadius(source);
			const tr = this._getNodeRadius(target);
			
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
			const r = this._getNodeRadius(d);
			d.x = Math.max(r, Math.min(this._state.width - r, d.x));
			d.y = Math.max(r, Math.min(this._state.height - r, d.y));
		};

		let hasAppliedInitialFit = false;
		this.simulation.on("tick", () => {
			if (!this.interactions.zoom) {
				this.nodeGroup.each(constrainNode);
			}
			
			this.linkSel.each(function (d) {
				const p = calculateLinkPosition(d);
				d3.select(this).attr("x1", p.x1).attr("y1", p.y1).attr("x2", p.x2).attr("y2", p.y2);
			});
			
			this.nodeGroup.attr("transform", (d) => {
				const x = Number.isNaN(d.x) ? this._state.width / 2 : d.x;
				const y = Number.isNaN(d.y) ? this._state.height / 2 : d.y;
				return `translate(${x},${y})`;
			});
			
			if (labelSel) {
				labelSel.each(function (d) {
					const placement = getLabelPlacement(d);
					d3.select(this)
					.attr("x", placement.x)
					.attr("y", placement.y)
					.style("text-anchor", placement.anchor)
					.style("dominant-baseline", placement.baseline);
				});
			}
			
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
				const r = this._getNodeRadius(node);
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

	updateData(payload = null, encoding = null, visualArtifacts = null) {
		this.destroy();
		this.render(payload || this._defaultPayload(), encoding || this.encoding, visualArtifacts);
	}
	
	updateEncoding(encoding, payload = null, visualArtifacts = null) {
		this.encoding = encoding;
		this.updateData(payload || this._defaultPayload(), encoding, visualArtifacts);
	}

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
		
		this.nodeGroup = null;
		this.linkSel = null;
		this.viewportGroup = null;
		this.zoomBehavior = null;
		
		super.destroy();
	}
}
