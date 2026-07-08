import {
	sankey,
	sankeyCenter,
	sankeyJustify,
	sankeyLeft,
	sankeyLinkHorizontal,
	sankeyRight
} from "d3-sankey";
import BaseRenderer from "./base-renderer.js";
import { MARK_TYPES, SORT_BY, SORT_MODE, SORT_ORDER } from "@wimmics/venus-core";

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

		const nodeRoles = Array.from(
			new Set(
				this.nodes.flatMap((node) => (Array.isArray(node?.roles) ? node.roles : []))
			)
		);

		this._retrieveMarkChannels({
			marks: [MARK_TYPES.NODES, MARK_TYPES.LINKS],
			roles: {
				[MARK_TYPES.NODES]: nodeRoles
			}
		});
		this._retrieveMarkAttributes({
			marks: [MARK_TYPES.NODES, MARK_TYPES.LINKS],
			roles: {
				[MARK_TYPES.NODES]: nodeRoles
			}
		});
		const { margin, innerHeight, innerWidth } = this.visualArtifacts?.layout
		const sankeyLayout = this.visualArtifacts?.layout || {};

		const align = this._resolveAlign(sankeyLayout.align);
		const nodeSort = this._buildNodeSortComparator({
			nodes: this.nodes,
			links: this.links,
			columns: sankeyLayout.columns || []
		});

		this.graph = sankey()
			.nodeId((d) => d.id)
			.nodeAlign(align)
			.nodeSort(nodeSort || undefined)
			.nodeWidth(sankeyLayout.nodeWidth)
			.nodePadding(sankeyLayout.nodePadding)
			.extent([[margin.left, margin.top], [innerWidth, innerHeight]])({
				nodes: this.nodes.map((d) => ({ ...d })),
				links: this.links.map((d) => ({
					...d,
					value: Number(d.value ?? d.weight ?? 1)
				}))
			});

		this._drawLinks()
		this._drawNodes()

		this._drawColumnTitles()

		this._setNodeEvents();
		this._setLinkEvents();

		return true;
	}

	_drawColumnTitles(){
		const { innerHeight } = this.visualArtifacts?.layout

		const columns = this.visualArtifacts.layout.columns.map(column => {
			const node = this.graph.nodes.find(n => n.level === column.index);
			return {
				...column,
				x: node ? (node.x0 + node.x1) / 2 : null
			};
		});

		this.chartGroup
			.append("g")
			.attr("class", "column-titles")
			.selectAll("text")
			.data(columns.filter(c => c.x != null))
			.enter()
				.append("text")
				.attr("x", d => d.x)
				.attr("y", innerHeight + 25)
				.attr("text-anchor", "middle")
				.text(d => d.title);
	}

	_drawLinks(){
		this.linkGroups = this.chartGroup
			.append("g")
			.attr("class", "links")
			.selectAll("path")
			.data(this.graph.links)
			.enter()
			.append("path")
			.attr("d", sankeyLinkHorizontal())
			.attr("fill", "none")
			.attr("stroke", (d) => this._getMarkColor(d, MARK_TYPES.LINKS) || "#999999")
			.attr("stroke-opacity", d => this._getMarkOpacity(d, MARK_TYPES.LINKS))
			.attr("stroke-width", (d) => Math.max(1, d.width || 1));

		this.linkLabels = this.chartGroup
			.append("g")
			.attr("class", "link-labels")
			.selectAll("text")
			.data(this.graph.links.filter((d) => this._displayLabel(d, MARK_TYPES.LINKS)))
			.enter()
			.append("text")
			.attr("x", (d) => (d.source.x1 + d.target.x0) / 2)
			.attr("y", (d) => (d.y0 + d.y1) / 2)
			.attr("text-anchor", "middle")
			.attr("dy", "0.35em")
			.style("font-size", "10px")
			.style("fill", "#555")
			.text((d) => this._getLabelText(d));
	}

	_drawNodes(){
		const { innerHeight, innerWidth } = this.visualArtifacts?.layout

		this.nodeGroups = this.chartGroup
			.append("g")
			.attr("class", "nodes")
			.selectAll("g")
			.data(this.graph.nodes)
			.enter()
			.append("g")
			.attr("class", "node");

		this.nodeGroups
			.append("rect")
			.attr("x", (d) => d.x0)
			.attr("y", (d) => d.y0)
			.attr("height", (d) => Math.max(1, d.y1 - d.y0))
			.attr("width", (d) => Math.max(1, d.x1 - d.x0))
			.attr("fill", (d) => this._getMarkColor(d, MARK_TYPES.NODES))
			.attr("stroke", (d) => this._getMarkStroke(d, MARK_TYPES.NODES))
			.attr("stroke-width", (d) => this._getMarkStrokeWidth(d, MARK_TYPES.NODES));

		this.nodeLabels = this.chartGroup
			.append("g")
			.attr("class", "node-labels")
			.selectAll("text")
			.data(this.graph.nodes.filter((d) => this._displayLabel(d, MARK_TYPES.NODES)))
			.enter()
			.append("text")
			.attr("x", (d) => (d.x0 < innerWidth / 2 ? d.x1 + 6 : d.x0 - 6))
			.attr("y", (d) => (d.y0 + d.y1) / 2)
			.attr("dy", "0.35em")
			.attr("text-anchor", (d) => (d.x0 < innerWidth / 2 ? "start" : "end"))
			.text((d) => this._getLabelText(d));
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

	_buildNodeSortComparator({ nodes = [], links = [], columns = [] } = {}) {
		const sortByLevel = new Map(
			(columns || []).map((column) => [column.index, column.sort || {
				by: SORT_BY.LAYOUT,
				order: SORT_ORDER.ASC,
				mode: null
			}])
		);

		const hasExplicitSorting = Array.from(sortByLevel.values()).some(
			(sort) => sort?.by && sort.by !== SORT_BY.LAYOUT
		);

		if (!hasExplicitSorting) return null;

		const nodeMetrics = this._computeNodeSortMetrics({ nodes, links });

		return (a, b) => {
			const levelA = this._resolveNodeLevel(a);
			const levelB = this._resolveNodeLevel(b);

			if (levelA !== levelB) return 0;

			const sort = sortByLevel.get(levelA) || {
				by: SORT_BY.LAYOUT,
				order: SORT_ORDER.ASC,
				mode: null
			};

			if (sort.by === SORT_BY.LAYOUT) return 0;

			const direction = sort.order === SORT_ORDER.DESC ? -1 : 1;
			const primary = this._compareNodesBySort({ a, b, sort, nodeMetrics });

			if (primary !== 0) return primary * direction;

			const labelTieBreak = this._compareNodeLabels(a, b);
			if (labelTieBreak !== 0) return labelTieBreak;

			return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
		};
	}

	_compareNodesBySort({ a, b, sort, nodeMetrics }) {
		switch (sort.by) {
			case SORT_BY.ALPHA:
				return this._compareNodeLabels(a, b);

			case SORT_BY.COUNT: {
				const metricKey = this._resolveSortMetricKey({ by: SORT_BY.COUNT, mode: sort.mode });
				const aValue = this._getNodeMetricValue(nodeMetrics, a?.id, metricKey);
				const bValue = this._getNodeMetricValue(nodeMetrics, b?.id, metricKey);
				return aValue === bValue ? 0 : aValue > bValue ? 1 : -1;
			}

			case SORT_BY.VALUE: {
				const metricKey = this._resolveSortMetricKey({ by: SORT_BY.VALUE, mode: sort.mode });
				const aValue = this._getNodeMetricValue(nodeMetrics, a?.id, metricKey);
				const bValue = this._getNodeMetricValue(nodeMetrics, b?.id, metricKey);
				return aValue === bValue ? 0 : aValue > bValue ? 1 : -1;
			}

			default:
				return 0;
		}
	}

	_resolveSortMetricKey({ by, mode }) {
		if (by === SORT_BY.COUNT) {
			switch (mode) {
				case SORT_MODE.IN:
					return "inCount";
				case SORT_MODE.OUT:
					return "outCount";
				default:
					return "totalCount";
			}
		}

		switch (mode) {
			case SORT_MODE.IN:
				return "inValue";
			case SORT_MODE.OUT:
				return "outValue";
			default:
				return "totalValue";
		}
	}

	_getNodeMetricValue(metricsByNode, nodeId, metricKey) {
		return metricsByNode.get(nodeId)?.[metricKey] ?? 0;
	}

	_compareNodeLabels(a, b) {
		const aLabel = String(this._getLabelText(a) ?? a?.label ?? a?.id ?? "").toLowerCase();
		const bLabel = String(this._getLabelText(b) ?? b?.label ?? b?.id ?? "").toLowerCase();
		return aLabel.localeCompare(bLabel);
	}

	_resolveNodeLevel(node) {
		if (Number.isFinite(node?.level)) return Number(node.level);
		if (Number.isFinite(node?.depth)) return Number(node.depth);
		if (Number.isFinite(node?.layer)) return Number(node.layer);
		return null;
	}

	_computeNodeSortMetrics({ nodes = [], links = [] } = {}) {
		const metrics = new Map();

		for (const node of nodes) {
			metrics.set(node.id, {
				inCount: 0,
				outCount: 0,
				totalCount: 0,
				inValue: 0,
				outValue: 0,
				totalValue: 0
			});
		}

		for (const link of links) {
			const sourceId = this._resolveNodeEndpointId(link?.source);
			const targetId = this._resolveNodeEndpointId(link?.target);
			const value = Number(link?.value ?? link?.weight ?? 1);

			if (!sourceId || !targetId || !Number.isFinite(value)) continue;

			if (!metrics.has(sourceId)) {
				metrics.set(sourceId, {
					inCount: 0,
					outCount: 0,
					totalCount: 0,
					inValue: 0,
					outValue: 0,
					totalValue: 0
				});
			}

			if (!metrics.has(targetId)) {
				metrics.set(targetId, {
					inCount: 0,
					outCount: 0,
					totalCount: 0,
					inValue: 0,
					outValue: 0,
					totalValue: 0
				});
			}

			const sourceMetrics = metrics.get(sourceId);
			sourceMetrics.outCount += 1;
			sourceMetrics.totalCount += 1;
			sourceMetrics.outValue += value;
			sourceMetrics.totalValue += value;

			const targetMetrics = metrics.get(targetId);
			targetMetrics.inCount += 1;
			targetMetrics.totalCount += 1;
			targetMetrics.inValue += value;
			targetMetrics.totalValue += value;
		}

		return metrics;
	}

	_resolveNodeEndpointId(endpoint) {
		if (endpoint && typeof endpoint === "object") return endpoint.id;
		return endpoint;
	}

	_setNodeEvents() {
		this.nodeGroups
			.on("mouseover", (event, d) => {
				this._focusMark({ mark: MARK_TYPES.NODES, activeDatum: d })
				this.callbacks.onHover?.({
					mark: MARK_TYPES.NODES,
					datum: d,
					x: event.offsetX,
					y: event.offsetY,
					event
				});
			})
			.on("mouseout", () => {
				this._resetFocusMark()
				this.callbacks.onOut?.();
			});
	}

	_setLinkEvents() {
		this.linkGroups
			.on("mouseover", (event, d) => {
				this._focusMark({ mark: MARK_TYPES.LINKS, activeDatum: d })
				this.callbacks.onHover?.({
					mark: MARK_TYPES.LINKS,
					datum: d,
					x: event.offsetX,
					y: event.offsetY,
					event
				});
			})
			.on("mouseout", () => {
				this._resetFocusMark()
				this.callbacks.onOut?.();
			});
	}

	_focusMark({ mark, activeDatum } = {}) {
		if (!activeDatum) return;
		

		if (mark === MARK_TYPES.NODES) {
			const activeNodeId = activeDatum.id;

			const relatedLinks = this.graph.links.filter(link =>
				link.source.id === activeNodeId ||
				link.target.id === activeNodeId
			);

			const relatedNodeIds = new Set([activeNodeId]);

			for (const link of relatedLinks) {
				relatedNodeIds.add(link.source.id);
				relatedNodeIds.add(link.target.id);
			}

			this.nodeGroups.classed(
				"node-downplayed",
				node => !relatedNodeIds.has(node.id)
			);

			this.linkGroups.classed(
				"link-downplayed",
				link =>
					link.source.id !== activeNodeId &&
					link.target.id !== activeNodeId
			);

			return;
		}

		if (mark === MARK_TYPES.LINKS) {
			const relatedNodeIds = new Set([
				activeDatum.source.id,
				activeDatum.target.id
			]);

			this.nodeGroups.classed(
				"node-downplayed",
				node => !relatedNodeIds.has(node.id)
			);

			this.linkGroups.classed(
				"link-downplayed",
				link => link !== activeDatum
			);
		}
	}
	
	_resetFocusMark() {
		this.nodeGroups.classed("node-downplayed", false);
		this.linkGroups.classed("link-downplayed", false);
	}
}