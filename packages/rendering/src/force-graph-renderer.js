import * as d3 from "d3";
import BaseRenderer from "./base-renderer.js";

import { ATTRIBUTE_TYPES, CHANNEL_TYPES, MARK_DEFAULTS, MARK_TYPES } from "@wimmics/venus-core";

export default class ForceGraphRenderer extends BaseRenderer {
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

	/**
	 * Expand multi-valued logical links into independently renderable curved edges.
	 */
	_expandLinksForRendering(links = []) {
		return links.flatMap((link) => {
			const values =
			Array.isArray(link.values) && link.values.length
				? link.values
				: [{ key: link.label || link.type, label: link.label || link.type, data: link }];

			return values.map((value, index) => ({
				...link,
				// Keep a pointer to the simulated link object so geometry uses live node positions.
				baseLink: link,
				renderIndex: index,
				renderCount: values.length,
				renderValue: value,
				label: value.label || value.key || link.label || link.type
			}));
		});
	}
	
	/**
	 * Build the full graph scene: defs, marks, interactions, and force simulation.
	 */
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
		
		this.renderedLinks = this._expandLinksForRendering(this.links);

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
		this._buildAdjacencyIndex()
		this._setInitialLabelsOpacity()

		// Handle interactive behavior
		this._setSimulation()
		this._setZoomBehavior();
		this._setDragAndDrop()
		
		return true;
	}

	/**
	 * Render link groups, strokes, and labels for every expanded edge.
	 */
	_drawLinks() {
		this.linkGroups = this.chartGroup
			.append("g")
			.attr("class", "links")
			.selectAll("g.link")
			.data(this.renderedLinks)
			.enter()
			.append("g")
			.attr("class", "link");

		this.linkPaths = this.linkGroups
			.append("path")
			.attr("id", (d, index) => `venus-link-path-${index}`)
			.attr("class", (d) => d.type || "directional")
			.attr("fill", "none")
			.attr("stroke", (d) =>
				this._getMarkColor(d.renderValue?.data || d, MARK_TYPES.LINKS)
			)
			.attr("stroke-width", (d) =>
				this._getMarkSize(d.renderValue?.data || d, MARK_TYPES.LINKS)
			);

		this.linkLabels = this.linkGroups
			.filter((d) => this._displayLabel(d, "links"))
			.append("g")
			.attr("class", "link-label");

			this.linkLabels.append("text")
				.style("pointer-events", "none")
				.style("font-size", "10px")
				.style("fill", "#555")
				.style("paint-order", "stroke")
				.style("stroke", "#ffffff")
				.style("stroke-width", "3px")
				.style("stroke-linejoin", "round")
				.append("textPath")
				.attr("href", function () {
					// Resolve the sibling path inside the same rendered link group.
					const linkGroup = this.closest("g.link");
					const pathId = linkGroup
						? d3.select(linkGroup).select("path").attr("id")
						: null;
					return pathId ? `#${pathId}` : null;
				})
				.attr("startOffset", "50%")
				.attr("text-anchor", "middle")
				.text((d) => d.label || d.relation || d.type || "");

		this._setLinkEvents();
	}

	/**
	 * Render node containers, circles, and optional labels.
	 */
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

	/**
	 * Apply initial label opacity before any zoom interaction occurs.
	 */
	_setInitialLabelsOpacity(){

		const initialZoom = this.interactions.zoom ? d3.zoomTransform(this.svg.node()).k : 1;

		this.nodeLabels.style("opacity", (d) => this._computeLabelOpacity(d, MARK_TYPES.NODES, initialZoom));

		this.linkLabels.style("opacity", (d) => this._computeLabelOpacity(d, MARK_TYPES.LINKS, initialZoom));
	}

	// Link helpers

	/**
	 * Resolve the rendered radius for a node from its size encoding.
	 */
	_getNodeRadius(node) {
		return this._getMarkSize(node, MARK_TYPES.NODES);
	}

	/**
	 * Read source/target endpoints from the live simulated link when available.
	 */
	_getResolvedLinkEndpoints(link) {
		const baseLink = link?.baseLink || link;

		return {
			source: baseLink?.source || link?.source || null,
			target: baseLink?.target || link?.target || null
		};
	}

	/**
	 * Compute the trimmed and optionally curved geometry for one rendered link.
	 */
	_getRenderedLinkGeometry(d) {
		const { source, target } = this._getResolvedLinkEndpoints(d);

		if (
			!source || !target ||
			!Number.isFinite(source.x) || !Number.isFinite(source.y) ||
			!Number.isFinite(target.x) || !Number.isFinite(target.y)
		) {
			return null;
		}

		const dx = target.x - source.x;
		const dy = target.y - source.y;
		const dist = Math.sqrt(dx * dx + dy * dy) || 1;

		const ux = dx / dist;
		const uy = dy / dist;

		const sr = this._getNodeRadius(source);
		const tr = this._getNodeRadius(target);

		const x1 = source.x + ux * sr;
		const y1 = source.y + uy * sr;
		const x2 = target.x - ux * tr;
		const y2 = target.y - uy * tr;

		const renderIndex = Number(d.renderIndex || 0);
		const renderCount = Number(d.renderCount || 1);
		// Spread parallel links symmetrically around the centerline.
		const offsetIndex = renderIndex - (renderCount - 1) / 2;

		const curvature = offsetIndex * 18;

		const mx = (x1 + x2) / 2;
		const my = (y1 + y2) / 2;

		const nx = -uy;
		const ny = ux;

		const cx = mx + nx * curvature;
		const cy = my + ny * curvature;

		return { x1, y1, x2, y2, cx, cy, curvature };
	}

	/**
	 * Convert computed link geometry into an SVG path string.
	 */
	_getRenderedLinkPath(d) {
		const g = this._getRenderedLinkGeometry(d);
		if (!g) return "";

		if (Math.abs(g.curvature) < 1e-6) {
			return `M${g.x1},${g.y1}L${g.x2},${g.y2}`;
		}

		return `M${g.x1},${g.y1}Q${g.cx},${g.cy} ${g.x2},${g.y2}`;
	}

	// Visual helpers
	/**
	 * Fade labels in or out based on zoom level and local mark size.
	 */
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

	/**
	 * Measure the current screen-space length of a link.
	 */
	_getLinkLength(link) {
		const { source, target } = this._getResolvedLinkEndpoints(link);

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

	/**
	 * Keep the legacy midpoint/angle helper available for straight-label fallbacks.
	 */
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

	/**
	 * Resolve the configured force-link distance attribute.
	 */
	_getLinkDistance() {
		return this._resolveAttribute({ mark: MARK_TYPES.LINKS, attribute: ATTRIBUTE_TYPES.DISTANCE })?.value
	}
		
	// Event helpers
	/**
	 * Enable pan/zoom and keep label opacity synchronized with the zoom factor.
	 */
	_setZoomBehavior() {
		if (this.interactions.zoom) {
			let _zoomRaf = null;
			this.zoomBehavior = d3
				.zoom()
				.scaleExtent([0.1, 8])
				.on("zoom", (event) => {
					this.chartGroup.attr("transform", event.transform);	
					// Throttle label opacity updates with requestAnimationFrame
					const k = event.transform.k;
					if (_zoomRaf) return; // Skip if already scheduled
					_zoomRaf = requestAnimationFrame(() => {
						_zoomRaf = null;
						this.nodeLabels.style("opacity", (d) => this._computeLabelOpacity(d, MARK_TYPES.NODES, k));
						this.linkLabels.style("opacity", (d) => this._computeLabelOpacity(d, MARK_TYPES.LINKS, k));
					});
				});
			this.svg.call(this.zoomBehavior);
		} else {
			this.svg.on(".zoom", null);
			this.zoomBehavior = null;
			this.chartGroup.attr("transform", null);
		}
	}

	/**
	 * Bind hover interactions to rendered links.
	 */
	_setLinkEvents() {
		this.linkGroups.on("mouseover", (event, d) => {
			this._focusMark({ mark: MARK_TYPES.LINKS, activeDatum: d })
			this.callbacks.onHover?.({
				mark: MARK_TYPES.LINKS,
				datum: d,
				x: event.offsetX,
				y: event.offsetY,
				event
			})
		})
		.on("mouseout", () => {
			this._resetFocusMark()
			this.callbacks.onOut?.()
		})
	}

	/**
	 * Bind hover, click, and context-menu interactions to nodes.
	 */
	_setNodeEvents() {
		this.nodeGroups.on("mouseover", (event, d) => {
			this._focusMark({ mark: MARK_TYPES.NODES, activeDatum: d });
			this.callbacks.onHover?.({
				mark: MARK_TYPES.NODES,
				datum: d,
				x: event.offsetX,
				y: event.offsetY,
				event
			});
		})
		.on("mouseout", () => {
			this._resetFocusMark();
			this.callbacks.onOut?.();
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

	/**
	 * Attach D3 drag behavior to nodes and feed changes back into the simulation.
	 */
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
	
	/**
	 * Highlight the active node or link while downplaying unrelated marks.
	 */
	/**
	 * Pre-compute adjacency map for O(1) neighbor lookups during hover.
	 */
	_buildAdjacencyIndex() {
		this._nodeNeighbors = new Map();
		for (const link of this.renderedLinks) {
			const s = link.baseLink.source.id;
			const t = link.baseLink.target.id;
			if (!this._nodeNeighbors.has(s)) this._nodeNeighbors.set(s, new Set([s]));
			if (!this._nodeNeighbors.has(t)) this._nodeNeighbors.set(t, new Set([t]));
			this._nodeNeighbors.get(s).add(t);
			this._nodeNeighbors.get(t).add(s);
		}
	}

	_focusMark({ mark, activeDatum } = {}) {
		if (!activeDatum) return;

		if (mark === MARK_TYPES.NODES){
			const activeNodeId = activeDatum.id;
			const relatedNodeIds = this._nodeNeighbors?.get(activeNodeId) || new Set([activeNodeId]);

			this.nodeGroups?.classed(
				"node-downplayed",
				(node) => !relatedNodeIds.has(node.id) )

			this.linkGroups?.classed(
				"link-downplayed",
				(link) => link.baseLink.source.id !== activeNodeId && link.baseLink.target.id !== activeNodeId )

			return
		}

		if (mark === MARK_TYPES.LINKS){
			const { source, target } = this._getResolvedLinkEndpoints(activeDatum);
			const sourceId = source?.id ?? source;
			const targetId = target?.id ?? target;
			const activeBaseLink = activeDatum?.baseLink || activeDatum;
			const relatedNodeIds = new Set([sourceId, targetId]);

			this.nodeGroups?.classed(
				"node-downplayed",
				(node) => !relatedNodeIds.has(node.id)
			);

			this.linkGroups?.classed(
				"link-downplayed",
				(link) => (link?.baseLink || link) !== activeBaseLink
			);

			return
		}
	}
	
	/**
	 * Remove any focus/downplay classes applied during hover interactions.
	 */
	_resetFocusMark() {
		this.nodeGroups?.classed("node-downplayed", false);
  		this.linkGroups?.classed("link-downplayed", false);
	}

	// Graph placement helpers

	/**
	 * Configure and run the force simulation, then update SVG positions on every tick.
	 */
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

			this.linkPaths.attr("d", (d) => this._getRenderedLinkPath(d));

			// Labels ride directly on textPath-linked curves, so no extra transform is needed.
			this.linkLabels.attr("transform", null);
			
			
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

	/**
	 * Fit the current simulated node cloud inside the viewport after stabilization.
	 */
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

	/**
	 * Update viewport size and nudge the simulation toward the new center.
	 */
	resize(width, height) {
		this.width = width || this.width;
		this.height = height || this.height;
		if (this.simulation) {
			this.simulation.force("center", d3.forceCenter(this.width / 2, this.height / 2));
			this.simulation.alpha(0.3).restart();
		}
	}
	
	/**
	 * Stop simulation work and release DOM/simulation references.
	 */
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
