import { SparqlToVisMapper } from "../sparql-to-vis-mapper.js";
import { extractId, resolveBindingLabel } from "../extract-bindings-info.js"
import { VIS_TYPES } from "@wimmics/venus-core";

import { calculateFlexibleCooccurrence } from "./cooccurrence.js"
import { addDirectionalLink, addSemanticLink } from "./link-builders.js";
import {
	collectExplicitNodeFields,
	copyBindingFieldsToNode,
	applyNodeLabelField,
	resolveRoleNodeConfig,
	addNodeRole,
	collectCooccurrenceEntities
} from "./node-field-utils.js";

export class SparqlToForceGraphMapper extends SparqlToVisMapper {
	
	constructor(options = {}) {
		super({ ...options, visType: VIS_TYPES.VENUS_GRAPH });
	}
	
	map(results, ctx) {
		this._assertValidResults(results);
		
		const vars = results.head.vars;
		const bindings = results.results.bindings;
		const mapping = ctx.encoding;
		
		const linkType = mapping?.links?.type;
		const sourceVar =
		linkType === "cooccurrence" ? mapping?.nodes?.field : mapping?.nodes?.source?.field
			
		const targetVar = mapping?.nodes?.target?.field
		
		const contextVar = mapping?.links?.context?.field || null;
		const relationVar = mapping?.links?.relation?.field || null;

		// Transform in array to treat below
		const cooccurrenceNodeVars = Array.isArray(sourceVar) ? sourceVar : [sourceVar] 
		
		const explicitNodeFieldConfig = collectExplicitNodeFields(mapping, {
			sourceVar,
			targetVar,
			linkType
		});
		
		const nodesMap = new Map();
		const linksMap = new Map();
		let cooccurrenceBindings = null;
		const isCooccurrenceMode = linkType === "cooccurrence";
		
		for (const binding of bindings) {
			if (isCooccurrenceMode) {
				const entityEntries = collectCooccurrenceEntities(binding, cooccurrenceNodeVars, extractId);
				if (!entityEntries.length) continue;
				
				for (const { varName, id } of entityEntries) {
					if (!nodesMap.has(id)) {
						const node = this._makeNode(binding, vars, varName, id, mapping?.nodes?.labels);
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
				const node = this._makeNode(binding, vars, sourceVar, sourceId, mapping?.nodes?.labels);
				nodesMap.set(sourceId, node);
			}
			const sourceNode = nodesMap.get(sourceId);
			addNodeRole(sourceNode, "source");
			copyBindingFieldsToNode(sourceNode, binding, vars);
			applyNodeLabelField(sourceNode, resolveRoleNodeConfig(mapping, sourceNode, "source", "labels"));
			
			if (linkType === "directional" && targetVar && binding[targetVar]) {
				addDirectionalLink({
					binding,
					vars,
					sourceId,
					targetVar,
					nodesMap,
					linksMap,
					copyNodeFields: copyBindingFieldsToNode,
					nodeLabel: mapping?.nodes,
					linkLabel: mapping?.links?.labels
				});
				continue;
			}
			
			if (linkType === "semantic" && targetVar && binding[targetVar]) {
				addSemanticLink({
					binding,
					vars,
					sourceId,
					targetVar,
					semanticVar: relationVar,
					nodesMap,
					linksMap,
					copyNodeFields: copyBindingFieldsToNode,
					nodeLabel: mapping?.nodes,
					linkLabel: mapping?.links?.labels
				});
				continue;
			}
			
		}
		
		if (isCooccurrenceMode && cooccurrenceBindings) {
			const coLinks = calculateFlexibleCooccurrence(cooccurrenceBindings, sourceVar, contextVar);
			for (const link of coLinks) {
				const key = `${link.source}-${link.target}-cooccurrence`;
				if (!linksMap.has(key)) linksMap.set(key, link);
			}
		}
		
		const finalNodes = Array.from(nodesMap.values());
		const finalLinks = Array.from(linksMap.values());
		
		this._addNodeDegrees(finalNodes, finalLinks);
		
		return {
			graph: { nodes: finalNodes, links: finalLinks },
			meta: {
				vars,
				mappingResolved: {
					sourceVar,
					targetVar,
					linkType,
					contextVar,
					relationVar
				},
				// expose the actual mapping (encoding) used to build the graph
				encodingUsed: JSON.parse(JSON.stringify(mapping))
			}
		};
	}
	
	_makeNode(binding, vars, entityVarName, id, labelConfig) {
		const bindingValue = binding[entityVarName];
		
		const node = {
			id,
			label: resolveBindingLabel(labelConfig, bindingValue, binding),
			uri: bindingValue.type === "uri" ? bindingValue.value : null,
			type: bindingValue.type,
			originalData: {}
		};
		
		copyBindingFieldsToNode(node, binding, vars);
		applyNodeLabelField(node, labelConfig);
		return node;
	}
	
	_addNodeDegrees(nodes, links) {
		const linkCount = new Map();
		
		for (const node of nodes) {
			linkCount.set(node.id, 0);
		}
		
		for (const link of links) {
			linkCount.set(link.source, (linkCount.get(link.source) || 0) + 1);
			linkCount.set(link.target, (linkCount.get(link.target) || 0) + 1);
		}
		
		for (const node of nodes) {
			node.degree = linkCount.get(node.id);
		}
	}
}
