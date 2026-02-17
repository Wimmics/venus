import { SparqlToVisMapper } from "../sparql-to-vis-mapper.js";
import { extractId, extractLabel } from "../extract-bindings-info.js"
import { VIS_TYPES } from "@wimmics/venus-core";

import { calculateFlexibleCooccurrence } from "./cooccurrence.js"
import { addDirectionalLink, addSemanticLink } from "./link-builders.js";
import {
	normalizeNodeFields,
	collectExplicitNodeFields,
	copyRelevantNodeFields,
	collectCooccurrenceEntities
} from "./node-field-utils.js";

export class SparqlToForceGraphMapper extends SparqlToVisMapper {
	
	constructor(options = {}) {
		super({ ...options, visType: VIS_TYPES.FORCE_GRAPH });
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
		const cooccurrenceNodeVars = normalizeNodeFields(mapping?.nodes?.field, sourceVar);
		const semanticVar =
		linkType === "semantic" && typeof mapping?.links?.field === "string"
		? mapping.links.field
		: null;
		const explicitNodeFieldConfig = collectExplicitNodeFields(mapping, {
			sourceVar,
			targetVar,
			linkType
		});
		
		const nodesMap = new Map();
		const linksMap = new Map();
		let cooccurrenceBindings = null;
		const isCooccurrenceMode = linkType === "semantic" && !targetVar;
		
		for (const binding of bindings) {
			if (isCooccurrenceMode) {
				const entityEntries = collectCooccurrenceEntities(binding, cooccurrenceNodeVars, extractId);
				if (!entityEntries.length) continue;

				for (const { varName, id } of entityEntries) {
					if (!nodesMap.has(id)) {
						const node = this._makeNode(binding, vars, varName, id, explicitNodeFieldConfig);
						nodesMap.set(id, node);
					}
					if (!cooccurrenceBindings) cooccurrenceBindings = [];
					cooccurrenceBindings.push({ sourceId: id, binding, vars });
				}
				continue;
			}

			if (!binding[sourceVar]) continue;
			
			const sourceId = extractId(binding[sourceVar]);
			
			if (!nodesMap.has(sourceId)) {
				const node = this._makeNode(binding, vars, sourceVar, sourceId, explicitNodeFieldConfig);
				nodesMap.set(sourceId, node);
			}
			
			if (linkType === "directional" && targetVar && binding[targetVar]) {
				addDirectionalLink({
					binding,
					vars,
					sourceId,
					targetVar,
					nodesMap,
					linksMap,
					explicitNodeFieldConfig,
					copyNodeFields: copyRelevantNodeFields
				});
				continue;
			}
			
			if (linkType === "semantic" && targetVar && binding[targetVar]) {
				addSemanticLink({
					binding,
					vars,
					sourceId,
					targetVar,
					semanticVar,
					nodesMap,
					linksMap,
					explicitNodeFieldConfig,
					copyNodeFields: copyRelevantNodeFields
				});
				continue;
			}
			
		}
		
		if (isCooccurrenceMode && cooccurrenceBindings) {
			const coLinks = calculateFlexibleCooccurrence(cooccurrenceBindings, sourceVar, semanticVar);
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
	
	_makeNode(binding, vars, entityVarName, id, explicitNodeFieldConfig) {
		const bindingValue = binding[entityVarName];
		
		const node = {
			id,
			label: extractLabel(bindingValue, entityVarName, binding, vars),
			uri: bindingValue.type === "uri" ? bindingValue.value : null,
			type: bindingValue.type,
			originalData: {}
		};
		
		copyRelevantNodeFields(node, binding, vars, entityVarName, explicitNodeFieldConfig);
		return node;
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
