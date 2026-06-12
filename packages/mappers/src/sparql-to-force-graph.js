import { SparqlToVisMapper } from "./sparql-to-vis-mapper.js";
import { extractId, resolveBindingLabel } from "./extract-bindings-info.js";
import { VIS_TYPES } from "@wimmics/venus-core";

export class SparqlToForceGraphMapper extends SparqlToVisMapper {
	constructor(options = {}) {
		super({ ...options, visType: VIS_TYPES.VENUS_GRAPH });
	}
	
	map(results, ctx = {}) {
		this._assertValidResults(results);
		
		const vars = results.head.vars || [];
		const bindings = results.results.bindings || [];
		const encoding = ctx.encoding || {};
		
		const resolved = this._resolveGraphEncoding(encoding);
		
		const nodesMap = new Map();
		const linksMap = new Map();
		
		if (resolved.linkType === "cooccurrence") {
			this._mapCooccurrenceGraph({
				bindings,
				vars,
				encoding,
				resolved,
				nodesMap,
				linksMap
			});
		} else if (resolved.linkType === "semantic") {
			this._mapSemanticGraph({
				bindings,
				vars,
				encoding,
				resolved,
				nodesMap,
				linksMap
			});
		} else {
			this._mapDirectionalGraph({
				bindings,
				vars,
				encoding,
				resolved,
				nodesMap,
				linksMap
			});
		}
		
		const nodes = Array.from(nodesMap.values());
		const links = Array.from(linksMap.values());
		
		this._finalizeLinks(links);
		this._addNodeDegrees(nodes, links);
		
		return {
			graph: { nodes, links },
			meta: {
				vars,
				mappingResolved: resolved,
				encodingUsed: JSON.parse(JSON.stringify(encoding))
			}
		};
	}
	
	_resolveGraphEncoding(encoding = {}) {
		const linkType = encoding?.links?.type || "directional";
		
		const sourceVar =
		linkType === "cooccurrence"
		? encoding?.nodes?.field
		: encoding?.nodes?.source?.field;
		
		const targetVar =
		linkType === "cooccurrence"
		? null
		: encoding?.nodes?.target?.field;
		
		return {
			linkType,
			sourceVar,
			targetVar,
			contextVar: encoding?.links?.context?.field || null,
			relationVar: encoding?.links?.relation?.field || null,
			cooccurrenceNodeVars: Array.isArray(sourceVar) ? sourceVar : [sourceVar].filter(Boolean)
		};
	}
	
	// ---------------------------------------------------------------------------
	// Directional links
	// ---------------------------------------------------------------------------
	
	_mapDirectionalGraph({ bindings, vars, encoding, resolved, nodesMap, linksMap }) {
		const { sourceVar, targetVar } = resolved;
		
		for (const binding of bindings) {
			if (!binding[sourceVar] || !binding[targetVar]) continue;
			
			const sourceNode = this._upsertNode({
				nodesMap,
				binding,
				entityVar: sourceVar,
				encoding,
				role: "source"
			});
			
			const targetNode = this._upsertNode({
				nodesMap,
				binding,
				entityVar: targetVar,
				encoding,
				role: "target"
			});
			
			this._upsertMergedLink({
				linksMap,
				sourceId: sourceNode.id,
				targetId: targetNode.id,
				type: "directional",
				binding,
				vars,
				label: this._resolveLinkLabel({
					linkLabelConfig: encoding?.links?.labels,
					fallbackBinding: binding[targetVar],
					binding
				}),
				value: {
					key: "directional",
					label: "directional",
					type: "directional",
					data: this._bindingToPlainObject(binding, vars)
				}
			});
		}
	}
	
	// ---------------------------------------------------------------------------
	// Semantic links
	// ---------------------------------------------------------------------------
	
	_mapSemanticGraph({ bindings, vars, encoding, resolved, nodesMap, linksMap }) {
		const { sourceVar, targetVar, relationVar } = resolved;
		
		for (const binding of bindings) {
			if (!binding[sourceVar] || !binding[targetVar]) continue;
			
			const sourceNode = this._upsertNode({
				nodesMap,
				binding,
				entityVar: sourceVar,
				encoding,
				role: "source"
			});
			
			const targetNode = this._upsertNode({
				nodesMap,
				binding,
				entityVar: targetVar,
				encoding,
				role: "target"
			});
			
			const relationBinding = relationVar ? binding[relationVar] : null;
			const relationValue = relationBinding?.value || "relation";
			const relationKey = relationBinding ? extractId(relationBinding) : relationValue;
			
			const valueData = this._bindingToPlainObject(binding, vars);
			if (relationVar) valueData[relationVar] = relationValue;
			
			this._upsertMergedLink({
				linksMap,
				sourceId: sourceNode.id,
				targetId: targetNode.id,
				type: "semantic",
				binding,
				vars,
				label: this._resolveLinkLabel({
					linkLabelConfig: encoding?.links?.labels,
					fallbackBinding: relationBinding || binding[targetVar],
					binding
				}),
				value: {
					key: relationKey,
					label: relationValue,
					type: "semantic",
					relation: relationKey,
					semanticLabel: relationValue,
					data: valueData
				}
			});
		}
	}
	
	// ---------------------------------------------------------------------------
	// Cooccurrence links
	// ---------------------------------------------------------------------------
	
	_mapCooccurrenceGraph({ bindings, vars, encoding, resolved, nodesMap, linksMap }) {
		const { cooccurrenceNodeVars, contextVar } = resolved;
		
		if (!contextVar) {
			throw new Error("Cooccurrence graph requires links.context.field");
		}
		
		const contextGroups = this._groupEntitiesByContext({
			bindings,
			vars,
			nodeVars: cooccurrenceNodeVars,
			contextVar,
			encoding,
			nodesMap
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
						pairBindings.map((binding) => this._bindingToPlainObject(binding, vars))
					);
					
					valueData[contextVar] = contextValue;
					
					this._upsertMergedLink({
						linksMap,
						sourceId,
						targetId,
						type: "cooccurrence",
						binding: pairBindings[0],
						vars,
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
	
	_groupEntitiesByContext({ bindings, vars, nodeVars, contextVar, encoding, nodesMap }) {
		const groups = new Map();
		
		for (const binding of bindings) {
			const contextBinding = binding?.[contextVar];
			if (!contextBinding?.value) continue;
			
			const contextValue = contextBinding.value;
			
			if (!groups.has(contextValue)) {
				groups.set(contextValue, new Map());
			}
			
			const entityMap = groups.get(contextValue);
			
			for (const entityVar of nodeVars) {
				const entityBinding = binding?.[entityVar];
				if (!entityBinding) continue;
				
				const node = this._upsertNode({
					nodesMap,
					binding,
					entityVar,
					encoding,
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
	
	// ---------------------------------------------------------------------------
	// Canonical nodes
	// ---------------------------------------------------------------------------
	
	_upsertNode({ nodesMap, binding, entityVar, encoding, role = null }) {
		const entityBinding = binding?.[entityVar];
		const id = extractId(entityBinding);
		
		if (!nodesMap.has(id)) {
			nodesMap.set(id, this._makeNode({
				binding,
				entityVar,
				id,
				encoding,
				role
			}));
		}
		
		const node = nodesMap.get(id);
		
		if (role) this._addNodeRole(node, role);
		
		this._copyNodeFieldsByRole(node, binding, { entityVar, labelVar: `${entityVar}Label`});
		
		const labelsConfig = this._resolveNodeLabelsConfig({ encoding, node, role });
		this._applyNodeLabelField(node, labelsConfig);
		
		return node;
	}
	
	_makeNode({ binding, entityVar, id, encoding, role }) {
		const entityBinding = binding?.[entityVar];
		const labelsConfig = this._resolveNodeLabelsConfig({ encoding, node: null, role });
		
		const node = {
			id,
			label: resolveBindingLabel(labelsConfig, entityBinding, binding),
			uri: entityBinding?.type === "uri" ? entityBinding.value : null,
			type: entityBinding?.type || null,
			originalData: {},
			roles: []
		};
		
		if (role) this._addNodeRole(node, role);
		
		this._copyNodeFieldsByRole(node, binding, {
			entityVar,
			labelVar: `${entityVar}Label`
		});
		this._applyNodeLabelField(node, labelsConfig);
		
		return node;
	}
	
	_resolveNodeLabelsConfig({ encoding, node, role }) {
		if (!role) return encoding?.nodes?.labels;
		
		const roles = Array.isArray(node?.roles) ? node.roles : [role];
		
		if (
			roles.length === 1 &&
			roles[0] === role &&
			encoding?.nodes?.[role]?.labels !== undefined
		) {
			return encoding.nodes[role].labels;
		}
		
		return encoding?.nodes?.labels;
	}
	
	_addNodeRole(node, role) {
		if (!node || (role !== "source" && role !== "target")) return;
		
		if (!Array.isArray(node.roles)) node.roles = [];
		if (!node.roles.includes(role)) node.roles.push(role);
	}
	
	_copyBindingFieldsToNode(node, binding, vars = []) {
		if (!node.originalData) node.originalData = {};
		
		for (const varName of vars) {
			const value = binding?.[varName]?.value;
			if (value === undefined || value === null) continue;
			
			node[varName] = this._mergeUniqueValue(node[varName], value);
			node.originalData[varName] = binding[varName];
		}
	}
	
	_copyNodeFieldsByRole(node, binding, { entityVar, labelVar = null }) {
		const entity = binding?.[entityVar];
		if (!entity) return;
		
		node[entityVar] = entity.value;
		
		if (labelVar && binding?.[labelVar]) {
			node[labelVar] = binding[labelVar].value;
		}
	}
	
	_applyNodeLabelField(node, labelsConfig) {
		if (!node || !labelsConfig) return;
		
		if (typeof labelsConfig?.value === "string") {
			node.label = labelsConfig.value;
			return;
		}
		
		const labelField =
		typeof labelsConfig?.field === "string" && labelsConfig.field.trim()
		? labelsConfig.field.trim()
		: null;
		
		if (labelField && node[labelField] !== undefined && node[labelField] !== null) {
			const value = node[labelField];
			node.label = Array.isArray(value) ? value[0] : value;
		}
	}
	
	// ---------------------------------------------------------------------------
	// Canonical merged links
	// ---------------------------------------------------------------------------
	
	_upsertMergedLink({
		linksMap,
		sourceId,
		targetId,
		type,
		binding,
		vars,
		label,
		value
	}) {
		const key = this._makePairKey(sourceId, targetId, type);
		
		if (!linksMap.has(key)) {
			linksMap.set(key, {
				source: sourceId,
				target: targetId,
				type,
				label: "",
				values: [],
				weight: 0
			});
		}
		
		const link = linksMap.get(key);
		
		this._mergeLinkBindingValues(link, binding, vars);
		this._addLinkValue(link, value);
		
		link.weight = link.values.length;
		link.label = this._joinLabels(link.values.map((item) => item.label || label || type));
		
		if (type === "semantic") {
			link.semanticLabel = link.label;
			link.relationshipType = "semantic";
		}
		
		if (type === "cooccurrence") {
			link.cooccurrence = true;
			link.semanticLabel = link.label;
			link.relationshipType = value?.contextField || "context";
			link.sharedValuesCount = link.values.length;
			link.sharedValuesDetails = link.values.map((item) => ({
				value: item.label,
				type: item.contextField || item.type
			}));
		}
		
		return link;
	}
	
	_makePairKey(sourceId, targetId, type) {
		if (type === "cooccurrence") {
			return [sourceId, targetId].sort().join("--");
		}
		
		return `${sourceId}--${targetId}`;
	}
	
	_addLinkValue(link, value) {
		if (!value) return;
		
		const key = value.key || value.label || value.type;
		const alreadyExists = link.values.some((item) => String(item.key) === String(key));
		
		if (!alreadyExists) {
			link.values.push(value);
			return;
		}
		
		const existing = link.values.find((item) => String(item.key) === String(key));
		existing.data = this._mergePlainRows([existing.data || {}, value.data || {}]);
	}
	
	_mergeLinkBindingValues(link, binding, vars = []) {
		if (!link || !binding) return;
		
		for (const varName of vars) {
			const value = binding?.[varName]?.value;
			if (value === undefined || value === null) continue;
			link[varName] = this._mergeUniqueValue(link[varName], value);
		}
	}
	
	_finalizeLinks(links = []) {
		for (const link of links) {
			if (!Array.isArray(link.values)) link.values = [];
			
			link.valueCount = link.values.length;
			link.weight = Math.max(1, link.valueCount || link.weight || 1);
			
			if (!link.label) {
				link.label = link.values.length
				? this._joinLabels(link.values.map((value) => value.label || value.key))
				: link.type;
			}
			
			link.tooltip = link.label;
		}
	}
	
	// ---------------------------------------------------------------------------
	// Utilities
	// ---------------------------------------------------------------------------
	
	_resolveLinkLabel({ linkLabelConfig, fallbackBinding, binding }) {
		return resolveBindingLabel(linkLabelConfig, fallbackBinding, binding);
	}
	
	_bindingToPlainObject(binding, vars = []) {
		const row = {};
		
		for (const varName of vars) {
			const value = binding?.[varName]?.value;
			if (value !== undefined && value !== null) {
				row[varName] = value;
			}
		}
		
		return row;
	}
	
	_mergePlainRows(rows = []) {
		const merged = {};
		
		for (const row of rows) {
			for (const [key, value] of Object.entries(row || {})) {
				if (value === undefined || value === null) continue;
				merged[key] = this._mergeUniqueValue(merged[key], value);
			}
		}
		
		return merged;
	}
	
	_mergeUniqueValue(currentValue, nextValue) {
		if (currentValue === undefined || currentValue === null) return nextValue;
		
		if (Array.isArray(currentValue)) {
			return currentValue.includes(nextValue)
			? currentValue
			: [...currentValue, nextValue];
		}
		
		return currentValue === nextValue
		? currentValue
		: [currentValue, nextValue];
	}
	
	_joinLabels(labels = []) {
		return Array.from(
			new Set(
				labels
				.filter((label) => label !== undefined && label !== null)
				.map(String)
				.filter(Boolean)
			)
		).join(", ");
	}
	
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