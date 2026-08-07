import { EncodingManager } from "./encoding-manager.js";

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

    getMarks() {
		return [ MARK_TYPES.NODES, MARK_TYPES.LINKS ]
	}

}