import { VisualArtifacts } from "./visual-artifacts";

export class GraphVisualArtifacts extends VisualArtifacts {
	build({ encoding, nodes = [], links = [] } = {}) {
		this.reset();
		
		if (!encoding || typeof encoding !== "object") {
			return this.toObject();
		}
		
		this._processNodeArtifacts(encoding.nodes, nodes);
		this._processNodeArtifacts(encoding.source, nodes)
		this._processNodeArtifacts(encoding.target, nodes)
		this._processLinkArtifacts(encoding.links, links);
		
		this._processLinkAttributes(encoding.links)
		console.log("nodesConfig = ", encoding.nodes)
		this._processNodeAttributes(encoding.nodes)
		
		return this.toObject();
	}
	
	_processNodeArtifacts(nodesConfig, nodes) {
		if (!nodesConfig || typeof nodesConfig !== "object") return;
		
		console.log("[_processNodeArtifacts] nodesConfig = ", nodesConfig)
		
		console.log("processing color channel...")
		this._processScaleChannel({
			mark: "nodes",
			channel: "color",
			channelConfig: nodesConfig.color,
			data: nodes,
			isColorScale: true
		});
		console.log("process size channel...")
		this._processScaleChannel({
			mark: "nodes",
			channel: "size",
			channelConfig: nodesConfig.size,
			data: nodes,
			isColorScale: false
		});
		
		console.log("processing tooltip ..")
		
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
	
	_processNodeAttributes(nodesConfig) {
		this._processAttribute({
			mark: "nodes",
			attribute: "stroke",
			attributeConfig: nodesConfig.stroke
		});
		
		this._processAttribute({
			mark: "nodes",
			attribute: "labels",
			attributeConfig: nodesConfig.labels
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