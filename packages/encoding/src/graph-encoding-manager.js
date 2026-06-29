import { EncodingManager } from "./encoding-manager";

import { getEncodingTemplate, MARK_TYPES } from "@wimmics/venus-core";

export class GraphEncodingManager extends EncodingManager {

    mergeEncoding(userEncoding) {
        const defaults = this.getDefaultEncoding();
		console.log("user encoding = ", userEncoding)
		console.log("default encoding = ", defaults)

		const mergedEncoding = {
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

		// Add defaults for semantic and directional graphs, via source and target tags
		if (mergedEncoding.links.type !== "cooccurrence") {
			mergedEncoding.nodes = {
				...mergedEncoding.nodes,
				source: { 
					...(defaults.nodes),
					...(userEncoding.nodes?.source)
				},
				target: { 
					...(defaults.nodes),
					...(userEncoding.nodes?.target)
				}
			}
		}

		return mergedEncoding
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