import { SparqlToGraphMapper } from "./sparql-to-graph.js";
import { VIS_TYPES } from "@wimmics/venus-core";

/**
 * Transforms SPARQL results into Sankey diagram visualization format.
 * 
 * Extends SparqlToGraphMapper with Sankey-specific logic for flow visualization.
 * Transforms SPARQL results into canonical node-link format optimized for
 * hierarchical flow representation.
 * 
 * Output format: { nodes: [...], links: [...] }
 * - nodes: Array of node objects with id, label, color, and other properties
 * - links: Array of link objects with source, target, value, opacity, and encoded properties
 * 
 * Sankey diagrams visualize flows between categories. Unlike force graphs, nodes are
 * positioned vertically and links flow horizontally with widths proportional to values.
 * 
 * @extends SparqlToGraphMapper
 * 
 * @example
 * const mapper = createSparqlMapper(VIS_TYPES.VENUS_SANKEY);
 * const sparqlResults = { 
 *   head: { vars: ['source', 'target', 'value', 'type'] }, 
 *   results: {...} 
 * };
 * const encoding = { 
 *   nodes: { color: { field: 'type' }, label: { field: 'label' } },
 *   links: { opacity: { field: 'value', scale: { type: 'sqrt', range: [0.1, 1] } } }
 * };
 * const mapped = mapper.map(sparqlResults, { encoding });
 * // Returns { nodes: [...], links: [...] }
 */
export class SparqlToSankey extends SparqlToGraphMapper {
    constructor(options = {}) {
        super({ ...options, visType: VIS_TYPES.VENUS_SANKEY });
    }

    _buildCanonicalGraph() {
        this.resolvedEncoding = this._resolveSankeyEncoding();

        for (const binding of this.bindings) {
            this._mapBindingStages(binding);
        }

        this._normalizeLinkValues();
    }

    _resolveSankeyEncoding() {
        const stageConfigs = this._normalizeStageFields(this.encoding?.nodes?.fields);
        const stageFields = stageConfigs.map((item) => item.field);

        const globalNodeColorField = this._resolveColorField(this.encoding?.nodes);
        const stageNodeColorFields = stageConfigs.map((item) => this._resolveColorField(item));

        // const aggregate = (this.encoding?.links?.value?.aggregate || "count").toLowerCase();

        return {
            stageConfigs,
            stageFields,
            valueField: this.encoding?.links?.value?.field || null,
            globalNodeColorField,
            stageNodeColorFields
            // aggregate
        };
    }

    _resolveColorField(config) {
        const field = config?.color?.field;
        return typeof field === "string" && field.trim() ? field.trim() : null;
    }

    _normalizeStageFields(fieldsConfig) {
        if (!Array.isArray(fieldsConfig)) return [];

        return fieldsConfig
            .map((item) => {
                if (typeof item === "string") {
                    const trimmed = item.trim();
                    return trimmed ? { field: trimmed } : null;
                }

                if (!item || typeof item !== "object") return null;

                const field = typeof item.field === "string" ? item.field.trim() : "";
                if (!field) return null;

                return {
                    ...item,
                    field
                };
            })
            .filter(Boolean);
    }

    _mapBindingStages(binding) {
        const { stageFields } = this.resolvedEncoding;
        if (!stageFields.length) return;

        const stageNodes = [];

        for (let level = 0; level < stageFields.length; level += 1) {
            const field = stageFields[level];
            const fieldBinding = binding?.[field];
            const value = fieldBinding?.value;

            if (value == null || value === "") {
                stageNodes.push(null);
                continue;
            }

            stageNodes.push(this._upsertStageNode({ binding, field, level }));
        }

        for (let level = 0; level < stageNodes.length - 1; level += 1) {
            const sourceNode = stageNodes[level];
            const targetNode = stageNodes[level + 1];

            if (!sourceNode || !targetNode) continue;

            this._upsertSankeyLink({
                sourceNode,
                targetNode,
                binding,
                sourceField: stageFields[level],
                targetField: stageFields[level + 1]
            });
        }
    }

    _upsertStageNode({ binding, field, level }) {
        const fieldBinding = binding?.[field];
        const nodeId = this._makeStageNodeId(level, fieldBinding?.value);
        const stageRole = this._makeStageRole(level);
        const stageConfig = this.resolvedEncoding?.stageConfigs?.[level] || { field };

        if (!this.nodesMap.has(nodeId)) {
            const node = this._makeNode({
                binding,
                entityVar: field,
                labelsConfig: this.encoding?.nodes?.labels
            });

            node.id = nodeId;
            node.stage = level;
            node.level = level;
            node.field = field;
            node.value = fieldBinding?.value;
            node.roles = [stageRole];
            node.label = this._resolveLabelFromBinding({
                labelsConfig: this.encoding?.nodes?.labels,
                fieldBindingValue: fieldBinding,
                currentBinding: binding
            }) || String(fieldBinding?.value || "");

            if (typeof stageConfig?.title === "string" && stageConfig.title.trim()) {
                node.stageTitle = stageConfig.title.trim();
            }

            this.nodesMap.set(nodeId, node);
        }

        const node = this.nodesMap.get(nodeId);
        this._mergeNodeAssociatedFields(node, binding, level);

        const tooltipFields = this._getTooltipFields({
            config: this.encoding?.nodes?.tooltip,
            binding,
            primaryFields: [field]
        });

        for (const tooltipField of tooltipFields) {
            const tooltipBinding = binding?.[tooltipField];
            if (!tooltipBinding) continue;

            node[tooltipField] = this._mergeUniqueValue(node[tooltipField], tooltipBinding.value);
            node.tooltipData[tooltipField] = this._mergeUniqueBinding(node.tooltipData[tooltipField], tooltipBinding);
        }

        return node;
    }

    _mergeNodeAssociatedFields(node, binding, level) {
        const scopedFields = new Set();

        const globalColorField = this.resolvedEncoding?.globalNodeColorField;
        if (globalColorField) scopedFields.add(globalColorField);

        const stageColorField = this.resolvedEncoding?.stageNodeColorFields?.[level];
        if (stageColorField) scopedFields.add(stageColorField);

        for (const associatedField of scopedFields) {
            const associatedBinding = binding?.[associatedField];
            const value = associatedBinding?.value;
            if (value === undefined || value === null) continue;

            node[associatedField] = this._mergeUniqueValue(node[associatedField], value);
            node.tooltipData[associatedField] = this._mergeUniqueBinding(
                node.tooltipData[associatedField],
                associatedBinding
            );
        }
    }

    _upsertSankeyLink({ sourceNode, targetNode, binding, sourceField, targetField }) {
        const key = this._makePairKey(sourceNode.id, targetNode.id, "sankey");
        const current = this.linksMap.get(key) || {
            source: sourceNode.id,
            target: targetNode.id,
            type: "sankey",
            value: 0,
            values: [],
            label: "",
            bindingCount: 0,
            tooltipData: {},
            sourceField,
            targetField
        };

        current.bindingCount = (current.bindingCount || 0) + 1;

        const delta = this._resolveLinkIncrement(binding);
        current.value += delta;

        const valueLabel = `${sourceNode.label} → ${targetNode.label}`;

        this._addLinkValue(current, {
            key: `${sourceNode.id}->${targetNode.id}`,
            label: valueLabel,
            type: "sankey",
            value: delta,
            data: this._bindingToPlainObject(binding)
        });

        const tooltipFields = this._getTooltipFields({
            config: this.encoding?.links?.tooltip,
            binding,
            primaryFields: [sourceField, targetField, this.resolvedEncoding.valueField].filter(Boolean)
        });

        this._mergeLinkBindingValues(current, binding, tooltipFields);
        current.label = `${sourceNode.label} → ${targetNode.label}`;

        this.linksMap.set(key, current);
    }

    _resolveLinkIncrement(binding) {
        const { valueField } = this.resolvedEncoding;

        const parsed = Number(binding?.[valueField]?.value);
        if (Number.isFinite(parsed)) return parsed;
        return 1;
    }

    _normalizeLinkValues() {
        const valueField = this.resolvedEncoding?.valueField;

        for (const link of this.linksMap.values()) {
            link.value = Number.isFinite(link.value) && link.value > 0 ? link.value : 0;

            const bindingCount = Number.isFinite(link.bindingCount) && link.bindingCount > 0
                ? link.bindingCount
                : 0;

            link.weight = link.value > 0
                ? link.value
                : Math.max(1, bindingCount || 1);

            // Metric tooltip fields should reflect the aggregated link value,
            // not an array of per-binding metric values.
            if (valueField) {
                link.tooltipData[valueField] = {
                    type: "literal",
                    value: String(link.value)
                };
                link[valueField] = link.value;
            }
        }
    }

    _makeStageNodeId(level, value) {
        return `${level}::${String(value)}`;
    }

    _makeStageRole(level) {
        return `stage-${level}`;
    }
}