import { SparqlToGraphMapper } from "./sparql-to-graph.js";
import { VIS_TYPES } from "@wimmics/venus-core";

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
        const stageFields = Array.isArray(this.encoding?.nodes?.fields)
            ? this.encoding.nodes.fields.filter((field) => typeof field === "string" && field.trim())
            : [];

        const aggregate = (this.encoding?.links?.value?.aggregate || "count").toLowerCase();

        return {
            stageFields,
            valueField: this.encoding?.links?.value?.field || null,
            aggregate
        };
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
            node.label = this._resolveLabelFromBinding({
                labelsConfig: this.encoding?.nodes?.labels,
                fieldBindingValue: fieldBinding,
                currentBinding: binding
            }) || String(fieldBinding?.value || "");

            this.nodesMap.set(nodeId, node);
        }

        const node = this.nodesMap.get(nodeId);
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

    _upsertSankeyLink({ sourceNode, targetNode, binding, sourceField, targetField }) {
        const key = this._makePairKey(sourceNode.id, targetNode.id, "sankey");
        const current = this.linksMap.get(key) || {
            source: sourceNode.id,
            target: targetNode.id,
            type: "sankey",
            value: 0,
            values: [],
            label: "",
            tooltipData: {},
            sourceField,
            targetField
        };

        const delta = this._resolveLinkIncrement(binding);
        current.value += delta;

        const valueLabel = `${sourceNode.label} -> ${targetNode.label}`;

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
        current.label = `${sourceNode.label} -> ${targetNode.label}`;

        this.linksMap.set(key, current);
    }

    _resolveLinkIncrement(binding) {
        const { aggregate, valueField } = this.resolvedEncoding;

        if (aggregate === "sum" && valueField) {
            const parsed = Number(binding?.[valueField]?.value);
            if (Number.isFinite(parsed)) return parsed;
            return 0;
        }

        return 1;
    }

    _normalizeLinkValues() {
        for (const link of this.linksMap.values()) {
            link.value = Number.isFinite(link.value) && link.value > 0 ? link.value : 0;
            link.weight = link.value;
        }
    }

    _makeStageNodeId(level, value) {
        return `${level}::${String(value)}`;
    }
}