import { MARK_TYPES } from "@wimmics/venus-core";
import { TooltipManager } from "./tooltip-manager";

export class GraphTooltipManager extends TooltipManager {

    constructor(opts = {}) {
        super(opts)

        this.metricKeys = [ "degree", "weight" ]
    }

    /**
     * Resolve tooltip title for graphs. If there is a label present then use it, otherwise build a title based on the data.
     * 
     * @param {*} datum The hovered datum
     * @param {*} mark The hovered mar
     * @returns A list containing a title (first value) and an optional subtitle (second value)
     */
    _getTitle(datum, mark){
        if (datum.label) return [ datum.label ]

        if (mark === MARK_TYPES.NODES) {
            const nodeConfig = this._resolveNodeRoleConfig(datum)
            return [ this._resolveTooltipTitle(datum, nodeConfig, datum.label || datum.id) ]
        }
        else {
            const source = datum.source?.id ?? datum.source
            const target = datum.target?.id ?? datum.target
            const relationship = datum.semanticLabel ? `\Relationship: ${datum.semanticLabel}` : ''
            return [ `${source} → ${target}`, relationship ]
        }
    }

    _getContent(datum) {

        const fields = this._resolveTooltipFields(datum)
        
        for (const key of Object.keys(fields)) {
            fields[key] = fields[key].map(field => {
                const rawValue = key === "dataFields" && datum.tooltipData
                    ? datum.tooltipData[field]
                    : datum[field];

                return {
                    key: field,
                    value: this._normalizeTooltipValue(rawValue)
                }
            })

            fields[key] = fields[key].filter(d => d.value && d.value.toString().length)
        }
        
        return fields
    }

    _normalizeTooltipValue(rawValue) {
        if (rawValue === undefined || rawValue === null) return null;

        const toDisplay = (value) => {
            if (value === undefined || value === null) return null;
            if (typeof value === "object" && !Array.isArray(value)) {
                return value.value ?? null;
            }
            return value;
        };

        if (Array.isArray(rawValue)) {
            const flattened = rawValue
                .map((item) => toDisplay(item))
                .filter((item) => item !== undefined && item !== null && String(item).length > 0);

            if (!flattened.length) return null;

            const unique = Array.from(new Set(flattened.map((item) => String(item))));
            return unique.join(", ");
        }

        return toDisplay(rawValue);
    }
	
    _resolveNodeRoleConfig(node) {
		const nodes = this.visualEncoding?.nodes || {};
		const roles = Array.isArray(node?.roles) ? node.roles : [];
		if (roles.length !== 1 || !nodes[roles[0]]) return nodes;
		return {
			...nodes,
			...nodes[roles[0]],
			tooltip: nodes[roles[0]].tooltip || nodes.tooltip
		};
	}
}

