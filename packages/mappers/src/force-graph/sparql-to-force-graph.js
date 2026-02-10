import { SparqlToVisMapper } from "../sparql-to-vis-mapper.js";
import { extractId, extractLabel } from "../extract-bindings-info.js"

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
		const defaultEnc = ctx.encodingManager?.getDefaultEncoding && ctx.encodingManager.getDefaultEncoding();
		const isDefaultEncoding =
			!ctx.encoding ||
			(ctx.encoding === defaultEnc) ||
			(ctx.encoding?.nodes?.field === "source" && ctx.encoding?.links?.field === "source-target");
		
		let usedAdaptiveEncoding = false;
		if (isDefaultEncoding) {
			mapping = ctx.encodingManager?.createAdaptiveEncoding(vars);
			usedAdaptiveEncoding = true;
		}
		
		const { sourceVar, targetVar, linkType } = ctx.encodingManager?.resolveFieldMapping(mapping, vars) || {};
		const semanticVar =
		linkType === "semantic" && typeof mapping?.links?.field === "string"
		? mapping.links.field
		: null;
		const explicitlyReferencedNodeFields = this._collectExplicitNodeFields(mapping);
		
		const nodesMap = new Map();
		const linksMap = new Map();
		let cooccurrenceBindings = null;
		
		for (const binding of bindings) {
			if (!binding[sourceVar]) continue;
			
			const sourceId = extractId(binding[sourceVar]);
			
			if (!nodesMap.has(sourceId)) {
				const node = this._makeNode(binding, vars, sourceVar, sourceId, explicitlyReferencedNodeFields);
				nodesMap.set(sourceId, node);
			}
			
			if (linkType === "directional" && targetVar && binding[targetVar]) {
				this._addDirectionalLink({ binding, vars, sourceId, targetVar, nodesMap, linksMap, explicitlyReferencedNodeFields });
				continue;
			}
			
			if (linkType === "semantic" && targetVar && binding[targetVar]) {
				this._addSemanticLink({ binding, vars, sourceId, targetVar, semanticVar, nodesMap, linksMap, explicitlyReferencedNodeFields });
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
			meta: {
				usedAdaptiveEncoding,
				vars,
				mappingResolved: { sourceVar, targetVar, linkType, semanticVar },
				// expose the actual mapping (encoding) used to build the graph
				encodingUsed: JSON.parse(JSON.stringify(mapping))
			}
		};
	}
	
	_makeNode(binding, vars, entityVarName, id, explicitlyReferencedNodeFields) {
		const bindingValue = binding[entityVarName];
		
		const node = {
			id,
			label: extractLabel(bindingValue, entityVarName, binding, vars),
			uri: bindingValue.type === "uri" ? bindingValue.value : null,
			type: bindingValue.type,
			originalData: {}
		};
		
		this._copyRelevantNodeFields(node, binding, vars, entityVarName, explicitlyReferencedNodeFields);
		return node;
	}
	
	_addDirectionalLink({ binding, vars, sourceId, targetVar, nodesMap, linksMap, explicitlyReferencedNodeFields }) {
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
			
			this._copyRelevantNodeFields(node, binding, vars, targetVar, explicitlyReferencedNodeFields);
			
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
		linksMap,
		explicitlyReferencedNodeFields
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
			
			this._copyRelevantNodeFields(node, binding, vars, targetVar, explicitlyReferencedNodeFields);
			
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

	_collectExplicitNodeFields(mapping) {
		const fields = new Set();
		const nodeColorConfig = mapping?.nodes?.color;
		const nodeColorConfigs = Array.isArray(nodeColorConfig) ? nodeColorConfig : [nodeColorConfig].filter(Boolean);

		for (const config of nodeColorConfigs) {
			if (typeof config?.field === "string" && config.field.trim()) {
				fields.add(config.field);
			}
		}

		if (typeof mapping?.nodes?.size?.field === "string" && mapping.nodes.size.field.trim()) {
			fields.add(mapping.nodes.size.field);
		}

		return fields;
	}

	_copyRelevantNodeFields(node, binding, vars, entityVarName, explicitlyReferencedNodeFields = new Set()) {
		const relatedVarNames = vars.filter((varName) => {
			if (varName === entityVarName) return true;
			if (varName.startsWith(entityVarName)) return true;
			if (varName === `${entityVarName}Label`) return true;
			if (varName === `${entityVarName}Name`) return true;
			if (explicitlyReferencedNodeFields.has(varName)) return true;
			return false;
		});

		for (const varName of relatedVarNames) {
			if (binding[varName]) {
				node[varName] = binding[varName].value;
				node.originalData[varName] = binding[varName];
			}
		}
	}
}
