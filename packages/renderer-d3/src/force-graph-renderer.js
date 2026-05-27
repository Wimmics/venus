import * as d3 from "d3";
import BaseRenderer from "./base-renderer.js";

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
		const { width, height, mapping, visualArtifacts } = this._state || {};
		console.log("visual artifacts = ", visualArtifacts)
		
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
			this._renderCenteredMessage(width, height, "No data to visualize");
			return false;
		}
		
		const interactionConfig = mapping?.interactions || {};
		const interactionsEnabled = interactionConfig.enabled !== false;
		const dragEnabled = interactionsEnabled && interactionConfig.drag !== false;
		const zoomEnabled = interactionsEnabled && interactionConfig.zoom !== false;
		const shouldConstrainNodes = !zoomEnabled;
		
		const nodeColorChannel = this._getArtifactChannel(visualArtifacts, "nodes", "color");
		const sourceNodeColorChannel = this._getArtifactChannel(visualArtifacts, "nodes", "color", "source");
		const targetNodeColorChannel = this._getArtifactChannel(visualArtifacts, "nodes", "color", "target");
		
		const nodeSizeChannel = this._getArtifactChannel(visualArtifacts, "nodes", "size");
		const sourceNodeSizeChannel = this._getArtifactChannel(visualArtifacts, "nodes", "size", "source");
		const targetNodeSizeChannel = this._getArtifactChannel(visualArtifacts, "nodes", "size", "target");
		
		const linkColorChannel = this._getArtifactChannel(visualArtifacts, "links", "color");
		const linkSizeChannel = this._getArtifactChannel(visualArtifacts, "links", "size");
		
		
		
		const resolveNodeChannelColor = (d) => {
			const roles = Array.isArray(d?.roles) ? d.roles : [];
			if (roles.length === 1 && roles[0] === "source" && sourceNodeColorChannel) {
				return sourceNodeColorChannel
			}
			if (roles.length === 1 && roles[0] === "target" && targetNodeColorChannel) {
				return targetNodeColorChannel
			}
			return nodeColorChannel
		}
		
		const resolveRoleNodeConfig = (d, property) => {
			const roles = Array.isArray(d?.roles) ? d.roles : [];
			const role = roles.length === 1 ? roles[0] : null;
			if (
				(role === "source" || role === "target") &&
				mapping.nodes?.[role]?.[property] !== undefined
			) {
				return mapping.nodes[role][property];
			}
			return mapping.nodes?.[property] || {};
		};
		
		const resolveNodeSizeChannel = (d) => {
			const roles = Array.isArray(d?.roles) ? d.roles : [];
			if (roles.length === 1 && roles[0] === "source" && sourceNodeSizeChannel) {
				return sourceNodeSizeChannel;
			}
			if (roles.length === 1 && roles[0] === "target" && targetNodeSizeChannel) {
				return targetNodeSizeChannel;
			}
			return nodeSizeChannel;
		};
		
		const resolveScaleValue = (d, channel, validate = (value) => value) => {
			const fallback = channel?.defaultValue;
			
			const field = channel?.field
			const scale = this._getArtifactScale(visualArtifacts, channel)
			
			if (!field || d[field] == null || !scale) {
				return fallback;
			}
			
			const value = scale(d[field]);
			
			return validate(value) ? value : fallback;
		}
		
		const isPositiveNumber = (value) => Number.isFinite(value) && value > 0;
		
		const getNodeColor = (d) => {
			return resolveScaleValue(d, resolveNodeChannelColor(d))
		};
		
		const getNodeRadius = (d) => {
			return resolveScaleValue(d, resolveNodeSizeChannel(d), isPositiveNumber)
		};
		
		const getLinkColor = (d) => {
			return resolveScaleValue(d, linkColorChannel)
		};
		
		const getLinkWidth = (d) => {
			return resolveScaleValue(d, linkSizeChannel, isPositiveNumber)
		};
		
		const linkDistance = this._getArtifactAttribute(visualArtifacts, "links", "distance")?.value
		
		const showNodeLabels = (node) => this._getArtifactAttribute( visualArtifacts, "nodes", "labels", node?.role)?.display !== false;
		
	
		const getNodeStroke = (node) => {
			const stroke = this._getArtifactAttribute( visualArtifacts, "nodes", "stroke", node?.role);
			
			return stroke?.display === false ? "none" : stroke?.color?.value;
		};
		
		const getNodeStrokeWidth = (node) => {
			const stroke = this._getArtifactAttribute( visualArtifacts, "nodes", "stroke", node?.role);
			
			return stroke?.display === false ? 0 : stroke?.width?.value
		};
		
		this.simulation = d3
			.forceSimulation(this.nodes)
			.force("link", d3.forceLink(this.links).id((d) => d.id).distance(linkDistance))
			.force("charge", d3.forceManyBody().strength(-200))
			.force("center", d3.forceCenter(width / 2, height / 2))
			.force("collision", d3.forceCollide().radius((d) => getNodeRadius(d) + 5))
			.force("x", d3.forceX(width / 2).strength(0.1))
			.force("y", d3.forceY(height / 2).strength(0.1));
		
		const constrainNode = (d) => {
			const r = getNodeRadius(d);
			d.x = Math.max(r, Math.min(width - r, d.x));
			d.y = Math.max(r, Math.min(height - r, d.y));
		};
		
		const computeNodeBounds = () => {
			let minX = Infinity;
			let minY = Infinity;
			let maxX = -Infinity;
			let maxY = -Infinity;
			
			for (const node of this.nodes) {
				const x = Number.isNaN(node?.x) ? width / 2 : node.x;
				const y = Number.isNaN(node?.y) ? height / 2 : node.y;
				const r = getNodeRadius(node);
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
		
		const applyInitialZoomFit = () => {
			if (!zoomEnabled || !this.zoomBehavior) return;
			const bounds = computeNodeBounds();
			if (!bounds) return;
			
			const padding = 30;
			const graphWidth = Math.max(1, bounds.maxX - bounds.minX);
			const graphHeight = Math.max(1, bounds.maxY - bounds.minY);
			const centerX = (bounds.minX + bounds.maxX) / 2;
			const centerY = (bounds.minY + bounds.maxY) / 2;
			const scale = Math.min(
				width / (graphWidth + padding * 2),
				height / (graphHeight + padding * 2),
				1
			);
			
			const transform = d3.zoomIdentity
			.translate(width / 2, height / 2)
			.scale(scale)
			.translate(-centerX, -centerY);
			
			this.svg.call(this.zoomBehavior.transform, transform);
		};
		
		const getLabelPlacement = (d) => {
			const centerX = width / 2;
			const centerY = height / 2;
			const nodeX = Number.isNaN(d?.x) ? centerX : d.x;
			const nodeY = Number.isNaN(d?.y) ? centerY : d.y;
			const dx = nodeX - centerX;
			const dy = nodeY - centerY;
			const offset = getNodeRadius(d) + 8;
			
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
		
		const interpolate = (value, min, max) => {
			if (value <= min) return 0;
			if (value >= max) return 1;
			return (value - min) / (max - min);
		};
		
		const computeLabelOpacity = (d, zoomK) => {
			if (!showNodeLabels(d)) return 0;
			const zoomOpacity = interpolate(zoomK, 0.45, 0.95);
			const renderedRadius = getNodeRadius(d) * zoomK;
			const sizeOpacity = interpolate(renderedRadius, 3, 7);
			return Math.max(0, Math.min(1, Math.min(zoomOpacity, sizeOpacity)));
		};
		
		this.viewportGroup = this.svg.append("g").attr("class", "viewport");
		let labelSel = null;
		
		if (zoomEnabled) {
			this.zoomBehavior = d3
			.zoom()
			.scaleExtent([0.1, 8])
			.on("zoom", (event) => {
				this.viewportGroup.attr("transform", event.transform);
				if (labelSel) {
					labelSel.style("opacity", (d) => computeLabelOpacity(d, event.transform.k));
				}
			});
			this.svg.call(this.zoomBehavior);
		} else {
			this.svg.on(".zoom", null);
			this.zoomBehavior = null;
			this.viewportGroup.attr("transform", null);
		}
		
		this.linkSel = this.viewportGroup
		.append("g")
		.attr("class", "links")
		.selectAll("line")
		.data(this.links)
		.enter()
		.append("line")
		.attr("class", (d) => d.type || "directional")
		.attr("stroke", getLinkColor)
		.attr("stroke-width", getLinkWidth)
		.on("mouseover", (event, d) => this.callbacks.onHover?.({
			mark: "link",
			datum: d,
			x: event.offsetX,
			y: event.offsetY,
			event
		}))
		.on("mouseout", () => this.callbacks.onOut?.({ mark: "link" }));
		
		this.nodeGroup = this.viewportGroup
		.append("g")
		.attr("class", "nodes")
		.selectAll("g")
		.data(this.nodes)
		.enter()
		.append("g")
		.on("mouseover", (event, d) => {
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
		
		if (dragEnabled) {
			this.nodeGroup.call(
				d3
				.drag()
				.on("start", (event, d) => dragstarted(event, d, this.simulation))
				.on("drag", (event, d) => dragged(event, d))
				.on("end", (event, d) => dragended(event, d, this.simulation))
			);
		}
		
		this.nodeGroup
		.append("circle")
		.attr("r", getNodeRadius)
		.attr("fill", getNodeColor)
		.attr("stroke", getNodeStroke)
		.attr("stroke-width", getNodeStrokeWidth);
		labelSel = this.nodeGroup
		.filter(showNodeLabels)
		.append("text")
		.attr("class", "node-label")
		.text((d) => d.label || d.id);
		if (labelSel) {
			const initialZoom = zoomEnabled ? d3.zoomTransform(this.svg.node()).k : 1;
			labelSel.style("opacity", (d) => computeLabelOpacity(d, initialZoom));
		}
		
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
			
			const sr = getNodeRadius(source);
			const tr = getNodeRadius(target);
			
			const ux = dx / dist;
			const uy = dy / dist;
			
			return {
				x1: source.x + ux * sr,
				y1: source.y + uy * sr,
				x2: target.x - ux * tr,
				y2: target.y - uy * tr
			};
		};
		
		let hasAppliedInitialFit = false;
		this.simulation.on("tick", () => {
			if (shouldConstrainNodes) {
				this.nodeGroup.each(constrainNode);
			}
			
			this.linkSel.each(function (d) {
				const p = calculateLinkPosition(d);
				d3.select(this).attr("x1", p.x1).attr("y1", p.y1).attr("x2", p.x2).attr("y2", p.y2);
			});
			
			this.nodeGroup.attr("transform", (d) => {
				const x = Number.isNaN(d.x) ? width / 2 : d.x;
				const y = Number.isNaN(d.y) ? height / 2 : d.y;
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
			
			if (zoomEnabled && !hasAppliedInitialFit && this.simulation.alpha() < 0.8) {
				applyInitialZoomFit();
				hasAppliedInitialFit = true;
			}
		});
		this.simulation.on("end", () => {
			if (zoomEnabled && !hasAppliedInitialFit) {
				applyInitialZoomFit();
				hasAppliedInitialFit = true;
			}
		});
		
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
		
		return true;
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
