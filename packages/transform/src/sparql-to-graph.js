import { SparqlToVisMapper } from "./sparql-to-vis-mapper";
import { MARK_TYPES, MARK_CHANNELS, MARK_ATTRIBUTES } from "@wimmics/venus-core";

export class SparqlToGraphMapper extends SparqlToVisMapper {
    
    map(results, ctx = {}) {
		this._assertValidResults(results);
		
		this.vars = results.head.vars || [];
		this.bindings = results.results.bindings || [];
		this.encoding = ctx.encoding || {};
		
		this.nodesMap = new Map();
		this.linksMap = new Map();
		
		this._buildCanonicalGraph();
		
		const nodes = Array.from(this.nodesMap.values());
		const links = Array.from(this.linksMap.values());
		
		this._postProcessCanonicalGraph(nodes, links)
		
		return {
			graph: { nodes, links },
			meta: {
				vars: this.vars,                                                                                                                                                                          
				mappingResolved: this.resolvedEncoding, // prepared by subclass
				encodingUsed: JSON.parse(JSON.stringify(this.encoding))
			}                        
		};              
	}

    _buildCanonicalGraph(){
        throw new Error("_buildCanonicalGraph must be implemented by subclass")
    }

	_postProcessCanonicalGraph(nodes, links) {
		this._finalizeLinks(links)
		this._addNodeDegrees(nodes, links)
	}

    // ---------------------------------------------------------------------------
    // Canonical nodes
    // ---------------------------------------------------------------------------
    
    _upsertNode({ binding, entityVar, role = null }) {
        
        const nodeConfig = this._resolveNodeConfig({ role })
        const node = this._makeNode({ binding, entityVar, labelsConfig: nodeConfig?.labels })

        if (node.id && !this.nodesMap.has(node.id)) {
            this.nodesMap.set(node.id, node);
        }
        
        if (role) this._addNodeRole(node, role);

        // Copy associated fields used on channels and attributes for rendering
        const associatedFields = this._getAssociatedFields(MARK_TYPES.NODES, nodeConfig)
        for (const field of associatedFields) {
            node[field] = binding[field]?.value
        }

        // Copy fields necessary for the tooltips (include encoding fields + entityVar)
        const tooltipFields = this._getTooltipFields({
            config: nodeConfig?.tooltip, 
            binding, 
            primaryFields: [ entityVar, ...associatedFields ]})

        for (const field of tooltipFields) {
            if (binding?.[field]) {
                node[field] = binding[field].value;
                node.tooltipData[field] = binding[field];
            }
        }
        
        this._applyNodeLabelField(node, nodeConfig?.labels);
        
        return node;
    }
    
    _makeNode({ binding, entityVar, labelsConfig = {} }) {
        const entityBinding = binding?.[entityVar];

        const node = {                                                                                                                                                                                                                                                                                                                                           
            id: entityBinding?.value,
            label: this._resolveLabelFromBinding({
                labelsConfig,                                                                        
                fieldBindingValue: entityBinding,
                currentBinding: binding
            }),                
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
		
		const link = this.linksMap.get(key) || {
			source: sourceId,
			target: targetId,
			type,
			label: "",
			values: [],
			weight: 0,
			bindingCount: 0,
			tooltipData: {}
		};

		if (!this.linksMap.has(key)) {
			this.linksMap.set(key, link);
		}

		link.bindingCount = (link.bindingCount || 0) + 1;
		
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
		
		link.weight = link.bindingCount;
		link.label = this._joinLabels(link.values.map((item) => item.label || label || type));
		
		this._addLinkContext({ link, binding: value, type })
		
		return link;
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

    // Helpers

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

    /**
	 * Resolves the display label for a link from configured label fields or a
	 * fallback binding value.
	 * Centralizing this logic keeps link-label behavior consistent across graph
	 * types.
	 */
	_resolveLinkLabel({ linkLabelConfig, fallbackBinding, binding }) {
		return this._resolveLabelFromBinding({
			labelsConfig: linkLabelConfig,
			fieldBindingValue: fallbackBinding,
			currentBinding: binding
		});
	}
	
	/**
	 * Converts a SPARQL binding row into a plain object keyed by variable name.
	 * This strips transport-specific wrapper objects so merged node and link data
	 * can be consumed more easily by later stages.
	 */
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
	
	/**
	 * Merges multiple plain rows into a single object, preserving distinct values
	 * for repeated fields.
	 * This is used to carry forward representative source data without losing
	 * information when multiple bindings contribute to the same graph element.
	 */
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
	
	/**
	 * Merges scalar values while promoting repeated distinct values into arrays.
	 * This preserves all observed values for a field without duplicating identical
	 * entries.
	 */
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

    /**
	 * Creates a stable key for identifying unique links during merge operations.
	 * Cooccurrence links are treated as undirected, so their key is normalized by
	 * sorting endpoints, while other graph types preserve endpoint order.
	 */
	_makePairKey(sourceId, targetId, type) {
		if (type === "cooccurrence") {
			return [sourceId, targetId].sort().join("--");
		}
		
		return `${sourceId}--${targetId}`;
	}

	/**
	 * Merges two RDF-style binding objects while avoiding duplicate equivalent
	 * values.
	 * This keeps aggregated link metadata compact and prevents repeated bindings
	 * from inflating the merged representation.
	 */
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
	
	/**
	 * Finalizes derived link metrics and fallback presentation fields after link
	 * merging is complete.
	 * Doing this in one pass keeps label, weight, and tooltip normalization
	 * consistent across all graph-building strategies.
	 */
	_finalizeLinks(links = []) {
		for (const link of links) {
			if (!Array.isArray(link.values)) link.values = [];
			
			link.valueCount = link.values.length;
			link.bindingCount = Number.isFinite(link.bindingCount) && link.bindingCount > 0
				? link.bindingCount
				: link.valueCount;

			const hasNumericStrength = Number.isFinite(link.value) && link.value > 0;
			link.weight = hasNumericStrength
				? link.value
				: Math.max(1, link.bindingCount || 1);
			
			if (!link.label) {
				link.label = link.values.length
				? this._joinLabels(link.values.map((value) => value.label || value.key))
				: link.type;
			}
			
			link.tooltip = link.label;
		}
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