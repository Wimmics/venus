import { EncodingManager } from "./encoding-manager";

import { CHANNEL_TYPES, MARK_TYPES } from "@wimmics/venus-core";

/**
 * Base encoding manager for network/graph visualizations (graphs and sankeys).
 * 
 * Provides common encoding logic for node-link diagram types. Validates and merges
 * node and link encoding specifications. Subclasses include ForceGraphEncodingManager
 * and SankeyEncodingManager.
 * 
 * @extends EncodingManager
 */
export class GraphEncodingManager extends EncodingManager {

    // mergeEncoding(userEncoding) {
    //     const defaults = this.getDefaultEncoding();

	// 	const mergedEncoding = {
	// 		...defaults,
	// 		...userEncoding,
	// 		interactions: {
	// 			...(defaults.interactions || {}),
	// 			...(userEncoding.interactions || {})
	// 		},
	// 		nodes: {
	// 			...(defaults.nodes || {}),
	// 			...(userEncoding.nodes || {}),
	// 			tooltip: {
	// 				...(defaults.nodes?.tooltip || {}),
	// 				...(userEncoding.nodes?.tooltip || {})
	// 			}
	// 		},
	// 		links: {
	// 			...(defaults.links || {}),
	// 			...(userEncoding.links || {}),
	// 			tooltip: {
	// 				...(defaults.links?.tooltip || {}),
	// 				...(userEncoding.links?.tooltip || {})
	// 			}
	// 		}
	// 	};

	// 	// Add defaults for semantic and directional graphs, via source and target tags
	// 	if (mergedEncoding.links.type !== "cooccurrence") {
	// 		mergedEncoding.nodes = {
	// 			...mergedEncoding.nodes, // global nodes options
	// 		}

	// 		for (let role of ["source", "target"]) {
	// 			mergedEncoding.nodes[role] = {
	// 				...(defaults.nodes),
	// 				...(userEncoding.nodes?.[role])
	// 			}

	// 			for (let channel of Object.values(CHANNEL_TYPES)) {
	// 				if ( defaults.nodes?.[channel] === undefined && userEncoding.nodes?.[role]?.[channel] === undefined) 
	// 					continue;

	// 				mergedEncoding.nodes[role][channel] = {
	// 					...defaults.nodes?.[channel],
	// 					...userEncoding.nodes?.[role]?.[channel]
	// 				}
	// 			}
	// 		}
	// 	}

	// 	console.log("graph merged encoding = ", mergedEncoding)

	// 	return mergedEncoding
    // }

	

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