import { SparqlToVisMapper } from "../sparql-to-vis-mapper.js";
import { extractId, extractLabel } from "../extract-bindings-info.js"

import { createLogger } from "@wimmics/kgnovis-core";
import { calculateFlexibleCooccurrence } from "./cooccurrence.js"

export class SparqlToForceGraphMapper extends SparqlToVisMapper {
	
	constructor(options = {}) {
		super({ ...options, visType: "force-graph" });
	}
	
	map(results, ctx) {
		this._assertValidResults(results);
		
		const vars = results.head.vars;
		const bindings = results.results.bindings;
		
		let mapping = ctx.encoding;
		const isDefaultEncoding =
		!ctx.encoding ||
		(ctx.encoding === ctx.defaultEncoding) ||
		(ctx.encoding?.nodes?.field === "source" && ctx.encoding?.links?.field === "source-target");
		
		let usedAdaptiveEncoding = false;
		if (isDefaultEncoding) {
			mapping = ctx.createAdaptiveEncoding(vars);
			usedAdaptiveEncoding = true;
		}
		
		const { sourceVar, targetVar, linkType } = ctx.resolveFieldMapping(mapping, vars);
		const semanticVar =
		linkType === "semantic" && typeof mapping?.links?.field === "string"
		? mapping.links.field
		: null;
		
		const nodesMap = new Map();
		const linksMap = new Map();
		let cooccurrenceBindings = null;
		
		for (const binding of bindings) {
			if (!binding[sourceVar]) continue;
			
			const sourceId = extractId(binding[sourceVar]);
			
			if (!nodesMap.has(sourceId)) {
				const node = this._makeNode(binding, vars, sourceVar, sourceId);
				nodesMap.set(sourceId, node);
			}
			
			if (linkType === "directional" && targetVar && binding[targetVar]) {
				this._addDirectionalLink({ binding, vars, sourceId, targetVar, nodesMap, linksMap });
				continue;
			}
			
			if (linkType === "semantic" && targetVar && binding[targetVar]) {
				this._addSemanticLink({ binding, vars, sourceId, targetVar, semanticVar, nodesMap, linksMap });
				continue;
			}
			
			if (linkType === "semantic" && !targetVar) {
				if (!cooccurrenceBindings) cooccurrenceBindings = [];
				cooccurrenceBindings.push({ sourceId, binding, vars });
			}
		}
		
		if (linkType === "semantic" && !targetVar && cooccurrenceBindings) {
			const coLinks = calculateFlexibleCooccurrence(cooccurrenceBindings, sourceVar, semanticVar, { extractIdFromBinding });
			for (const link of coLinks) {
				const key = `${link.source}-${link.target}-cooccurrence`;
				if (!linksMap.has(key)) linksMap.set(key, link);
			}
		}
		
		const finalNodes = Array.from(nodesMap.values());
		const finalLinks = Array.from(linksMap.values());
		
		this._addLinkCounts(finalNodes, finalLinks);
		
		return {
			graph: { nodes: finalNodes, links: finalLinks },
			meta: { usedAdaptiveEncoding, vars, mappingResolved: { sourceVar, targetVar, linkType, semanticVar } }
		};
	}
	
	_makeNode(binding, vars, entityVarName, id) {
		const bindingValue = binding[entityVarName];
		
		const node = {
			id,
			label: extractLabel(bindingValue, entityVarName, binding, vars),
			uri: bindingValue.type === "uri" ? bindingValue.value : null,
			type: bindingValue.type,
			originalData: {}
		};
		
		for (const varName of vars) {
			if (binding[varName]) {
				node[varName] = binding[varName].value;
				node.originalData[varName] = binding[varName];
			}
		}
		return node;
	}
	
	_addDirectionalLink({ binding, vars, sourceId, targetVar, nodesMap, linksMap }) {
		if (!binding[targetVar]) return;
		
		const targetBinding = binding[targetVar];
		const targetId = extractId(targetBinding);
		
		// Ensure target node exists
		if (!nodesMap.has(targetId)) {
			const node = {
				id: targetId,
				label: extractLabel(targetBinding, targetVar, binding, vars),
				uri: targetBinding.type === "uri" ? targetBinding.value : null,
				type: targetBinding.type,
				originalData: {}
			};
			
			for (const varName of vars) {
				if (binding[varName]) {
					node[varName] = binding[varName].value;
					node.originalData[varName] = binding[varName];
				}
			}
			
			nodesMap.set(targetId, node);
		}
		
		// Create link
		const linkKey = `${sourceId}-${targetId}`;
		
		if (!linksMap.has(linkKey)) {
			const link = {
				source: sourceId,
				target: targetId,
				type: "directional"
			};
			
			for (const varName of vars) {
				if (binding[varName]) {
					link[varName] = binding[varName].value;
				}
			}
			
			linksMap.set(linkKey, link);
		}
	}
	
	_addSemanticLink({
		binding,
		vars,
		sourceId,
		targetVar,
		semanticVar,
		nodesMap,
		linksMap
	}) {
		if (!binding[targetVar]) return;
		
		const targetBinding = binding[targetVar];
		const targetId = extractId(targetBinding);
		
		// Ensure target node exists
		if (!nodesMap.has(targetId)) {
			const node = {
				id: targetId,
				label: extractLabel(targetBinding, targetVar, binding, vars),
				uri: targetBinding.type === "uri" ? targetBinding.value : null,
				type: targetBinding.type,
				originalData: {}
			};
			
			for (const varName of vars) {
				if (binding[varName]) {
					node[varName] = binding[varName].value;
					node.originalData[varName] = binding[varName];
				}
			}
			
			nodesMap.set(targetId, node);
		}
		
		const linkKey = `${sourceId}-${targetId}-semantic`;
		
		if (!linksMap.has(linkKey)) {
			const semanticLabel =
			semanticVar && binding[semanticVar]
			? binding[semanticVar].value
			: "relation";
			
			const link = {
				source: sourceId,
				target: targetId,
				type: "semantic",
				semanticLabel,
				tooltip: semanticLabel
			};
			
			for (const varName of vars) {
				if (binding[varName]) {
					link[varName] = binding[varName].value;
				}
			}
			
			linksMap.set(linkKey, link);
		}
	}
	
	_addLinkCounts(nodes, links) {
		const linkCount = new Map();
		
		for (const node of nodes) {
			linkCount.set(node.id, 0);
		}
		
		for (const link of links) {
			linkCount.set(link.source, (linkCount.get(link.source) || 0) + 1);
			linkCount.set(link.target, (linkCount.get(link.target) || 0) + 1);
		}
		
		for (const node of nodes) {
			node.links = linkCount.get(node.id);
		}
	}
}

