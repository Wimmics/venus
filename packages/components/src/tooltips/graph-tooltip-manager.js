import { MARK_TYPES } from "@wimmics/venus-core";
import { TooltipManager } from "./tooltip-manager";

export class GraphTooltipManager extends TooltipManager {

    constructor(opts = {}) {
        super(opts)

        this.metricKeys = [ "degree", "weight" ]
    }

    _getTitle(datum, mark){
        
        if (mark === MARK_TYPES.NODES) {
            const nodeConfig = this._resolveNodeRoleConfig(datum)
            return [ this._resolveTooltipTitle(datum, nodeConfig, datum.id) ]
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

        for (let key of Object.keys(fields)) {
            fields[key] = fields[key].map(field => {

                return {
                    key: field,
                    value: datum.tooltipData ? datum.tooltipData[field]?.value : datum[field]
                }
            })

            fields[key] = fields[key].filter(d => d.value && d.value.toString().length)
        }
        
        return fields
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

