import { EncodingManager } from "./encoding-manager";

import { getEncodingTemplate, MARK_TYPES } from "@wimmics/venus-core";

export class GraphEncodingManager extends EncodingManager {

    mergeEncoding(userEncoding) {
        return this._mergeGraphEncoding()
    }

    getDefaultEncoding() {
		return getEncodingTemplate(this.getChartType());
	}

    getMarks() {
		return [ MARK_TYPES.NODES, MARK_TYPES.LINKS ]
	}

    validateVisSpecificEncoding(merged) {
		this._validateGraphSpecificEncoding(merged)
	}

   

    _mergeGraphEncoding(userEncoding) {
		const defaults = this.getDefaultEncoding();

		return {
			...defaults,
			...userEncoding,
			interactions: {
				...(defaults.interactions || {}),
				...(userEncoding.interactions || {})
			},
			nodes: {
				...(defaults.nodes || {}),
				...(userEncoding.nodes || {}),
				tooltip: {
					...(defaults.nodes?.tooltip || {}),
					...(userEncoding.nodes?.tooltip || {})
				}
			},
			links: {
				...(defaults.links || {}),
				...(userEncoding.links || {}),
				tooltip: {
					...(defaults.links?.tooltip || {}),
					...(userEncoding.links?.tooltip || {})
				}
			}
		};
	}

    _validateSingleScaleConfig(encoding) {
		if (Array.isArray(encoding?.nodes?.color)) {
			throw new Error('Invalid encoding: "nodes.color" must be an object, not an array.');
		}
		if (Array.isArray(encoding?.nodes?.size)) {
			throw new Error('Invalid encoding: "nodes.size" must be an object, not an array.');
		}
		if (Array.isArray(encoding?.links?.color)) {
			throw new Error('Invalid encoding: "links.color" must be an object, not an array.');
		}
	}

    _validateNodeMetricConfig(encoding){
        // Implemented by subclass when needed
    }

    _validateGraphConstructionConfig(encoding) {
        // Implemented by subclass when needed
    }
}