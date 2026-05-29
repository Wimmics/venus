import { VisualArtifacts } from "./visual-artifacts";
import { CHANNEL_TYPES } from "@wimmics/venus-core";

export class GraphVisualArtifacts extends VisualArtifacts {
	build({ encoding, nodes = [], links = [], width = null, height = null } = {}) {
		this.reset();
		
		if (!encoding || typeof encoding !== "object") {
			return this.toObject();
		}
		
		this._processNodeArtifacts(encoding.nodes, nodes);
		this._processNodeArtifacts(encoding.source, nodes)
		this._processNodeArtifacts(encoding.target, nodes)
		this._processLinkArtifacts(encoding.links, links);
		
		this._processLinkAttributes(encoding.links)
		
		return this.toObject();
	}
	
	_processNodeArtifacts(nodesConfig, nodes) {
		if (!nodesConfig || typeof nodesConfig !== "object") return;

		for (let channel of [CHANNEL_TYPES.COLOR, CHANNEL_TYPES.STROKE]) {
			this._processScaleChannel({
				mark: "nodes",
				channel: channel,
				channelConfig: nodesConfig[channel],
				data: nodes,
				isColorScale: true
			});
		}
		
		for (let channel of [CHANNEL_TYPES.SIZE, CHANNEL_TYPES.STROKE_WIDTH]) {
			this._processScaleChannel({
				mark: "nodes",
				channel: channel,
				channelConfig: nodesConfig[channel],
				data: nodes,
				isColorScale: false
			});
		}

		this._processAttribute({
			mark: "nodes",
			attribute: "labels",
			attributeConfig: nodesConfig.labels
		});
		
		this._processTooltip({
			mark: "nodes",
			tooltipConfig: nodesConfig.tooltip
		});
	}
	
	_processLinkArtifacts(linksConfig, links) {
		if (!linksConfig || typeof linksConfig !== "object") return;
		
		this._processScaleChannel({
			mark: "links",
			channel: "color",
			channelConfig: linksConfig.color,
			data: links,
			isColorScale: true
		});
		
		this._processScaleChannel({
			mark: "links",
			channel: "size",
			channelConfig: linksConfig.size,
			data: links,
			isColorScale: false
		});
		
		this._processTooltip({
			mark: "links",
			tooltipConfig: linksConfig.tooltip
		});
	}
	
	_processLinkAttributes(linksConfig) {
		this._processAttribute({
			mark: "links",
			attribute: "distance",
			attributeConfig: { value: linksConfig.distance }
		});
	}
	
	_parseStrokeWidth(value) {
		if (Number.isFinite(value) && Number(value) >= 0) return Number(value);
		
		if (typeof value === "string") {
			const pxMatch = value.trim().match(/^(\d+(?:\.\d+)?)px$/i);
			if (pxMatch) return Number(pxMatch[1]);
			
			const numeric = Number(value);
			if (Number.isFinite(numeric) && numeric >= 0) return numeric;
		}
		
		return 1.5;
	}
}