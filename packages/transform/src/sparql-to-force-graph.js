import { SparqlToGraphMapper } from "./sparql-to-graph.js";
import { MARK_ATTRIBUTES, MARK_CHANNELS, MARK_TYPES, VIS_TYPES } from "@wimmics/venus-core";

export class SparqlToForceGraphMapper extends SparqlToGraphMapper {
	/**
	 * Initializes the mapper with the force-graph visualization type.
	 * This ensures downstream graph-building logic always runs against the
	 * expected Venus graph configuration.
	 */
	constructor(options = {}) {
		super({ ...options, visType: VIS_TYPES.VENUS_GRAPH });
	}

	/**
	 * Builds the canonical graph structure by resolving the graph encoding and
	 * dispatching to the appropriate graph-mapping strategy.
	 * This centralizes the routing decision so each link model can be handled by
	 * a dedicated method with minimal branching inside the mappers themselves.
	 */
	_buildCanonicalGraph(){
		this.resolvedEncoding = this._resolveGraphEncoding();

		if (this.resolvedEncoding.linkType === "cooccurrence") {
			this._mapCooccurrenceGraph();
		} else if (this.resolvedEncoding.linkType === "semantic") {
			this._mapSemanticGraph();
		} else {
			this._mapDirectionalGraph();
		}
	}
	
	/**
	 * Normalizes the encoding definition into a single resolved shape used by the
	 * graph builders.
	 * This avoids repeatedly re-reading optional nested encoding fields and gives
	 * the rest of the class a stable contract regardless of graph type.
	 */
	_resolveGraphEncoding() {
		const linkType = this.encoding?.links?.type || "directional";
		
		const sourceVar =
			linkType === "cooccurrence"
			? this.encoding?.nodes?.field
			: this.encoding?.nodes?.source?.field;
		
		const targetVar =
			linkType === "cooccurrence"
			? null
			: this.encoding?.nodes?.target?.field;
		
		return {
			linkType,
			sourceVar,
			targetVar,
			contextVar: this.encoding?.links?.context?.field || null,
			relationVar: this.encoding?.links?.relation?.field || null,
			cooccurrenceNodeVars: Array.isArray(sourceVar) ? sourceVar : [sourceVar].filter(Boolean)
		};
	}
	
	// ---------------------------------------------------------------------------
	// Directional links
	// ---------------------------------------------------------------------------
	
	/**
	 * Maps bindings into a directional graph where each row contributes a source
	 * node, a target node, and a directed edge between them.
	 * This is the default graph mode and preserves source-to-target flow for data
	 * where the relationship direction matters.
	 */
	_mapDirectionalGraph() {
		const { sourceVar, targetVar } = this.resolvedEncoding;
		
		for (const binding of this.bindings) {
			if (!binding[sourceVar] || !binding[targetVar]) continue;
			
			const sourceNode = this._upsertNode({
				binding,
				entityVar: sourceVar,
				role: "source"
			});
			
			const targetNode = this._upsertNode({
				binding,
				entityVar: targetVar,
				role: "target"
			});
			
			this._upsertMergedLink({
				sourceId: sourceNode.id,
				targetId: targetNode.id,
				type: "directional",
				binding,
				label: this._resolveLinkLabel({
					linkLabelConfig: this.encoding?.links?.labels,
					fallbackBinding: binding[targetVar],
					binding
				}),
				value: {
					key: "directional",
					label: "directional",
					type: "directional",
					data: this._bindingToPlainObject(binding)
				}
			});
		}
	}
	
	// ---------------------------------------------------------------------------
	// Semantic links
	// ---------------------------------------------------------------------------
	
	/**
	 * Maps bindings into a semantic graph where links are annotated with an
	 * explicit relation value when one is available.
	 * This keeps the edge semantics visible in the output so consumers can render
	 * or inspect relationship types instead of treating all links as equivalent.
	 */
	_mapSemanticGraph() {
		const { sourceVar, targetVar, relationVar } = this.resolvedEncoding;
		
		for (const binding of this.bindings) {
			if (!binding[sourceVar] || !binding[targetVar]) continue;
			
			const sourceNode = this._upsertNode({
				binding,
				entityVar: sourceVar,
				role: "source"
			});
			
			const targetNode = this._upsertNode({
				binding,
				entityVar: targetVar,
				role: "target"
			});
			
			const relationBinding = relationVar ? binding[relationVar] : null;
			const relationValue = relationBinding?.value || "relation";
			
			const valueData = this._bindingToPlainObject(binding);
			if (relationVar) valueData[relationVar] = relationValue;
			
			this._upsertMergedLink({
				sourceId: sourceNode.id,
				targetId: targetNode.id,
				type: "semantic",
				binding,
				label: this._resolveLinkLabel({
					linkLabelConfig: this.encoding?.links?.labels,
					fallbackBinding: relationBinding || binding[targetVar],
					binding
				}),
				value: {
					key: relationValue,
					label: relationValue,
					type: "semantic",
					relation: relationValue,
					semanticLabel: relationValue,
					data: valueData
				}
			});
		}
	}
	
	// ---------------------------------------------------------------------------
	// Cooccurrence links
	// ---------------------------------------------------------------------------
	
	/**
	 * Maps bindings into a cooccurrence graph by linking entities that appear in
	 * the same context group.
	 * This lets the graph represent shared participation in a context, which is a
	 * different signal from explicit source-target relationships.
	 */
	_mapCooccurrenceGraph() {
		const { cooccurrenceNodeVars, contextVar } = this.resolvedEncoding
		
		if (!contextVar) {
			throw new Error("Cooccurrence graph requires links.context.field");
		}
		
		const contextGroups = this._groupEntitiesByContext({
			nodeVars: cooccurrenceNodeVars,
			contextVar
		});
		
		for (const [contextValue, entityMap] of contextGroups.entries()) {
			const entities = Array.from(entityMap.keys());
			
			if (entities.length < 2) continue;
			
			for (let i = 0; i < entities.length; i += 1) {
				for (let j = i + 1; j < entities.length; j += 1) {
					const sourceId = entities[i];
					const targetId = entities[j];
					
					const pairBindings = [
						...(entityMap.get(sourceId) || []),
						...(entityMap.get(targetId) || [])
					];
					
					const valueData = this._mergePlainRows(
						pairBindings.map((binding) => this._bindingToPlainObject(binding))
					);
					
					valueData[contextVar] = contextValue;
					
					this._upsertMergedLink({
						sourceId,
						targetId,
						type: "cooccurrence",
						binding: pairBindings[0],
						label: String(contextValue),
						value: {
							key: String(contextValue),
							label: String(contextValue),
							type: "cooccurrence",
							contextField: contextVar,
							contextValue,          
							data: valueData
						}
					});
				}
			}
		}
	}
	
	/**
	 * Groups entity bindings by their context value and ensures the corresponding
	 * nodes exist before cooccurrence links are derived.
	 * This precomputation makes pair generation straightforward and prevents the
	 * cooccurrence mapper from repeatedly rebuilding the same context buckets.
	 */
	_groupEntitiesByContext({ nodeVars, contextVar }) {                                    
		const groups = new Map();
		
		for (const binding of this.bindings) {
			const contextBinding = binding?.[contextVar];
			if (!contextBinding?.value) continue;
			                                                                          
			const contextValue = contextBinding.value;
			
			if (!groups.has(contextValue)) {
				groups.set(contextValue, new Map())                         
			}
			
			const entityMap = groups.get(contextValue);
			
			for (const entityVar of nodeVars) {
				const entityBinding = binding?.[entityVar];
				if (!entityBinding) continue;                  
				                                                                        
				
				const node = this._upsertNode({
					binding,
					entityVar,
					role: null
				});
				                                                                                    
				if (!entityMap.has(node.id)) {
					entityMap.set(node.id, []);
				}
				
				entityMap.get(node.id).push(binding);                                                                       
			}
		}     
		                     
		return groups;                                                     
	}
	
	/**
	 * Records whether a node participates as a source or target in directional
	 * graph modes.
	 * Preserving these roles allows downstream consumers to distinguish node
	 * participation without recomputing it from the link list.
	 */
	_addNodeRole(node, role) {
		if (!node || (role !== "source" && role !== "target")) return;
		
		if (!Array.isArray(node.roles)) node.roles = [];
		if (!node.roles.includes(role)) node.roles.push(role);
	}

	/**
	 * Adds graph-type-specific metadata onto a merged link.
	 * This enriches the final edge object with semantic or cooccurrence context so
	 * rendering and inspection layers do not need to infer it later.
	 */
	_addLinkContext({ link, binding, type }){
		if (type === "semantic") {
			link.semanticLabel = link.label;
			link.relationshipType = "semantic";
		}
		
		if (type === "cooccurrence") {
			link.cooccurrence = true;
			link.semanticLabel = link.label;
			link.relationshipType = binding?.contextField || "context";
			link.sharedValuesCount = link.values.length;
			link.sharedValuesDetails = link.values.map((item) => ({
				value: item.label,
				type: item.contextField || item.type
			}));
		}

		return link
	}
	
	/**
	 * Computes the degree of each node from the finalized link list.
	 * Degree is a basic graph metric used by layouts and visual encodings, so it
	 * is derived once here instead of being recomputed by consumers.
	 */
	_addNodeDegrees(nodes, links) {
		const degreeById = new Map();
		
		for (const node of nodes) {
			degreeById.set(node.id, 0);
		}
		
		for (const link of links) {
			degreeById.set(link.source, (degreeById.get(link.source) || 0) + 1);
			degreeById.set(link.target, (degreeById.get(link.target) || 0) + 1);
		}
		
		for (const node of nodes) {
			node.degree = degreeById.get(node.id) || 0;
		}
	}

}