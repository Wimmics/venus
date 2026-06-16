import { SparqlToVisMapper } from "./sparql-to-vis-mapper.js";
import { extractId, resolveBindingLabel } from "./extract-bindings-info.js";
import { MARK_ATTRIBUTES, MARK_CHANNELS, MARK_TYPES, VIS_TYPES } from "@wimmics/venus-core";

export class SparqlToForceGraphMapper extends SparqlToVisMapper {
	constructor(options = {}) {
		super({ ...options, visType: VIS_TYPES.VENUS_GRAPH });
	}
	
	map(results, ctx = {}) {
		this._assertValidResults(results);
		
		this.vars = results.head.vars || [];
		this.bindings = results.results.bindings || [];
		this.encoding = ctx.encoding || {};
		
		this.resolvedEncoding = this._resolveGraphEncoding();
		
		this.nodesMap = new Map();
		this.linksMap = new Map();
		
		if (this.resolvedEncoding.linkType === "cooccurrence") {
			this._mapCooccurrenceGraph();
		} else if (this.resolvedEncoding.linkType === "semantic") {
			this._mapSemanticGraph();
		} else {
			this._mapDirectionalGraph();
		}
		
		const nodes = Array.from(this.nodesMap.values());
		const links = Array.from(this.linksMap.values());
		
		this._finalizeLinks(links);
		this._addNodeDegrees(nodes, links);
		
		return {
			graph: { nodes, links },
			meta: {
				vars: this.vars,
				mappingResolved: this.resolvedEncoding,
				encodingUsed: JSON.parse(JSON.stringify(this.encoding))
			}
		};
	}
	
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
			const relationKey = relationBinding ? extractId(relationBinding) : relationValue;
			
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
	
	_groupEntitiesByContext({ nodeVars, contextVar }) {
		const groups = new Map();
		
		for (const binding of this.bindings) {
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
	
	// ---------------------------------------------------------------------------
	// Canonical nodes
	// ---------------------------------------------------------------------------
	
	_upsertNode({ binding, entityVar, role = null }) {
		const entityBinding = binding?.[entityVar];
		const id = extractId(entityBinding);
		
		const nodeConfig = this._resolveNodeConfig({ role })
		const node = this._makeNode({ binding, entityVar, id, labelsConfig: nodeConfig?.labels })

		if (!this.nodesMap.has(id)) {
			this.nodesMap.set(id, node);
		}
		
		if (role) this._addNodeRole(node, role);

		// Copy associated fields used on channels and attributes for rendering
		const associatedFields = this._getAssociatedFields(MARK_TYPES.NODES, nodeConfig)
		for (const field of associatedFields) {
			node[field] = binding[field]?.value
		}

		// Copy fields necessary for the tooltips
		const tooltipFields = this._getTooltipFields({
			config: nodeConfig?.tooltip, 
			binding, 
			primaryFields: [ entityVar ]})

		for (const field of tooltipFields) {
			if (binding?.[field]) {
				node[field] = binding[field].value;
				node.tooltipData[field] = binding[field];
			}
		}
		
		this._applyNodeLabelField(node, nodeConfig?.labels);
		
		return node;
	}
	
	_makeNode({ binding, entityVar, id, labelsConfig = {} }) {
		const entityBinding = binding?.[entityVar];

		const node = {
			id,
			label: resolveBindingLabel(labelsConfig, entityBinding, binding),
			type: entityBinding?.type || null,
			tooltipData: {},
			roles: []
		};

		node[entityVar] = binding[entityVar]?.value;
		node.tooltipData[entityVar] = binding[entityVar];
		
		return node;
	}
	
	_resolveNodeConfig({ role }) {
		if (!role) return this.encoding?.nodes;
		
		return this.encoding.nodes[role] ?? this.encoding?.nodes
	}
	
	_addNodeRole(node, role) {
		if (!node || (role !== "source" && role !== "target")) return;
		
		if (!Array.isArray(node.roles)) node.roles = [];
		if (!node.roles.includes(role)) node.roles.push(role);
	}

	_getAssociatedFields(mark, nodeConfig) {
		const encodingFields = MARK_CHANNELS[mark].concat(MARK_ATTRIBUTES[mark])

		const dataFields = []
		for (const field of encodingFields) {
			dataFields.push(nodeConfig?.[field]?.field)
		}

		return dataFields.filter(Boolean)
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
		sourceId,
		targetId,
		type,
		binding,
		label,
		value
	}) {
		const key = this._makePairKey(sourceId, targetId, type);
		
		const link = {
				source: sourceId,
				target: targetId,
				type,
				label: "",
				values: [],
				weight: 0,
				tooltipData: {} }

		if (!this.linksMap.has(key)) {
			this.linksMap.set(key, link);
		}
		
		const tooltipFields = this._getTooltipFields({
			config: this.encoding?.links?.tooltip,
			binding, 
			primaryFields: [
				this.resolvedEncoding.sourceVar,
				this.resolvedEncoding.targetVar,
				this.resolvedEncoding.relationVar,
				this.resolvedEncoding.contextVar
			].filter(Boolean)
		})
		
		this._mergeLinkBindingValues(link, binding, tooltipFields);
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
	
	_mergeLinkBindingValues(link, binding, tooltipFields = []) {
		if (!link || !binding) return;

		if (!link.tooltipData) link.tooltipData = {};

		// Binding values for link construction
		for (const field of this.vars) {
			const bindingValue = binding?.[field];
			if (!bindingValue) continue;

			link[field] = this._mergeUniqueValue(
				link[field],
				bindingValue.value
			);
		}

		// Binding values for tooltips
		for (const field of tooltipFields) {
			const bindingValue = binding?.[field];
			if (!bindingValue) continue;

			link.tooltipData[field] = this._mergeUniqueBinding(
				link.tooltipData[field],
				bindingValue
			);
		}
	}

	_mergeUniqueBinding(currentValue, nextValue) {
		if (!currentValue) return nextValue;

		const sameBinding = (a, b) =>
			a?.type === b?.type &&
			a?.value === b?.value &&
			a?.datatype === b?.datatype &&
			a?.["xml:lang"] === b?.["xml:lang"];

		if (Array.isArray(currentValue)) {
			return currentValue.some((item) => sameBinding(item, nextValue))
			? currentValue
			: [...currentValue, nextValue];
		}

		return sameBinding(currentValue, nextValue)
			? currentValue
			: [currentValue, nextValue];
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
	
	_bindingToPlainObject(binding) {
		const row = {};
		
		for (const varName of this.vars) {
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

	// Tooltip resolvers

	_getTooltipFields({
		config = {},
		binding,
		primaryFields = []
	} = {}) {
		const explicit = config?.field ?? config?.fields;

		if (Array.isArray(explicit)) return explicit;
		if (typeof explicit === "string") return [explicit];

		return this._getDataAssociatedFields({
			binding,
			primaryFields
		});
	}

	_getDataAssociatedFields({ binding, primaryFields = [] }) {
		const result = new Set();

		for (const primaryField of primaryFields) {
			if (!binding?.[primaryField]) continue;

			result.add(primaryField);

			for (const candidateField of this.vars) {
				if (candidateField === primaryField) continue;
				if (!binding?.[candidateField]) continue;

				if (this._areBindingValuesAssociated(binding[primaryField], binding[candidateField])) {
					result.add(candidateField);
				}
			}
		}

		return Array.from(result);
	}

	// Binding association logic
	_areBindingValuesAssociated(a, b) {
		const av = a?.value;
		const bv = b?.value;

		if (!av || !bv) return false;
		if (av === bv) return true;

		const aIsUri = a?.type === "uri" || this._looksLikeUri(av);
		const bIsUri = b?.type === "uri" || this._looksLikeUri(bv);

		// URI ↔ literal
		if (aIsUri && !bIsUri) {
			return this._uriMatchesLiteral(av, bv);
		}

		if (bIsUri && !aIsUri) {
			return this._uriMatchesLiteral(bv, av);
		}

		// URI ↔ URI
		if (aIsUri && bIsUri) {
			return this._uriTerminal(av) === this._uriTerminal(bv);
		}

		// literal ↔ literal: conservative, only exact normalized match
		return this._normalizeText(av) === this._normalizeText(bv);
	}

	_looksLikeUri(value) {
		return /^https?:\/\//i.test(String(value));
	}

	_uriMatchesLiteral(uri, literal) {
		const terminal = this._uriTerminal(uri);
		const normalizedLiteral = this._normalizeText(literal);

		if (!terminal || !normalizedLiteral) return false;

		return (
			terminal === normalizedLiteral ||
			terminal.includes(normalizedLiteral) ||
			normalizedLiteral.includes(terminal)
		);
	}

	_uriTerminal(uri) {
		const value = String(uri || "");

		const cleaned = value
			.split(/[?#]/)[0]
			.replace(/\/$/, "");

		const terminal = cleaned.substring(
			Math.max(cleaned.lastIndexOf("/"), cleaned.lastIndexOf("#")) + 1
		);

		try {
			return this._normalizeText(decodeURIComponent(terminal));
		} catch {
			return this._normalizeText(terminal)
		}
	}

	_normalizeText(value) {
		return String(value || "")
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[_\-]+/g, " ")
			.replace(/[^\p{L}\p{N}]+/gu, " ")
			.trim();
	}

}