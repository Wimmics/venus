/**
 * Encoding manager for force-directed graph visualizations.
 * 
 * Validates and merges force graph-specific encoding specifications. Force graphs
 * support node and link encodings with physics simulation. Manages node-link field
 * mappings, visual properties, and interaction settings. Extends GraphEncodingManager
 * with force graph-specific defaults.
 * 
 * @extends GraphEncodingManager
 */
import { GraphEncodingManager } from "./graph-encoding-manager.js";
import { CHANNEL_TYPES, getMarkSupportedKeys, getSupportedChannels, MARK_TYPES, VIS_TYPES } from "@wimmics/venus-core";

export class ForceGraphEncodingManager extends GraphEncodingManager {

	getChartType() {
		return VIS_TYPES.VENUS_GRAPH
	}

	mergeVisSpecificEncoding(mergedEncoding, defaults, userEncoding){

		// Only complete the encoding of user-provided channels (override the remaining with global "nodes" encoding)
		const getRoleSupportedChannels = (role) => {
			return Object.keys(userEncoding?.nodes?.[role]).filter(key => Object.values(CHANNEL_TYPES).includes(key))
		}

		// Add defaults for semantic and directional graphs, via source and target tags
		if (mergedEncoding.links.type !== "cooccurrence") {

			mergedEncoding.nodes = {
				...mergedEncoding.nodes, // global "nodes" options
			}

			for (let role of ["source", "target"]) {
				mergedEncoding.nodes[role] = {
					...(userEncoding.nodes?.[role])
				}
				
				this._mergeChannels(
					mergedEncoding.nodes[role], 
					defaults.nodes, 
					userEncoding.nodes?.[role], 
					getRoleSupportedChannels(role)
				)
			}
		}


	}

	validateVisSpecificEncoding(userEncoding){
        this._validateNodes(userEncoding);
        this._validateLinks(userEncoding);
    }   
	
	_validateNodes(userEncoding) {
		if (!this._isProvided(userEncoding?.nodes)) {
			throw new Error(`Invalid encoding: "nodes" are required for ${this.getChartType()}.`)
		}

		if (!this._isNonEmptyObject(userEncoding?.nodes)) {
            throw new Error(`Invalid encoding: "nodes" must be a non-empty object containing "field", "fields", or "source" and "target" properties.`)
        }

		const nodesEncoding = userEncoding?.nodes;
		const supportedNodeKeys = [
			...getMarkSupportedKeys(MARK_TYPES.NODES),
			"field",
			"fields",
			"source",
			"target"
		];

		this._validateMarkChannels(nodesEncoding, "nodes", MARK_TYPES.NODES)
		this._validateSupportedKeys(supportedNodeKeys, Object.keys(nodesEncoding), "nodes")

		for (const role of ["source", "target"]) {
			if (!this._isProvided(nodesEncoding?.[role])) {
				continue;
			}

			this._validateTooltips(nodesEncoding?.[role], `nodes.${role}`)
			
			this._validateMarkChannels(nodesEncoding?.[role], `nodes.${role}`, MARK_TYPES.NODES)

			this._validateSupportedKeys(getMarkSupportedKeys(MARK_TYPES.NODES), Object.keys(nodesEncoding?.[role]), `nodes.${role}`)
		}
	}
	
	_validateLinks(userEncoding) {
		const linksEncoding = userEncoding?.links
		const nodesEncoding = userEncoding?.nodes

		if (this._isProvided(linksEncoding?.field)) {
			throw new Error(
				'Invalid encoding: "links.field" is not supported. Use "nodes.source.field" and "nodes.target.field", "links.relation.field", or "links.context.field".'
			);
		}

		if (this._isProvided(linksEncoding?.distance) && !this._isNonNegativeNumber(linksEncoding?.distance)) {
			throw new Error(`Invalid encoding: "links.distance" must be a non-negative number when provided.`)
		}

		const linkType = linksEncoding?.type;
		if (linkType && !["directional", "semantic", "cooccurrence"].includes(linkType)) {
			throw new Error('Invalid encoding: "links.type" must be "directional", "semantic", or "cooccurrence".');
		}

		if (linkType === "cooccurrence") {
			if (!nodesEncoding?.field && !nodesEncoding?.fields) {
				throw new Error('Invalid encoding: "nodes.field" or "nodes.fields" is required for co-occurrence graphs.');
			}

			if (!this._isProvided(linksEncoding?.context?.field)) {
				throw new Error('Invalid encoding: "links.context.field" is required for co-occurrence graphs.');
			}
			
			this._validateField(linksEncoding?.context?.field, "links.context")

			if (this._isProvided(nodesEncoding?.source) || this._isProvided(nodesEncoding?.target)) {
				console.warn(`Ignored encoding: "nodes.source" and "nodes.target" are not required for co-occurrence graphs.`)
			}

			return
		}

		
		if (!this._isProvided(nodesEncoding?.source) || !this._isProvided(nodesEncoding?.target)) {
			throw new Error(`Invalid encoding: "nodes.source" and "nodes.target" are required for directional and semantic graphs.`)
		} 

		if (!this._isProvided(nodesEncoding?.source?.field) || !this._isProvided(nodesEncoding?.target?.field)) {
			throw new Error('Invalid encoding: "nodes.source.field" and "nodes.target.field" are required for directional and semantic graphs.');
		}

		this._validateField(nodesEncoding?.source?.field, "nodes.source")
		this._validateField(nodesEncoding?.target?.field, "nodes.target")

		if (linkType === "semantic") {
			if (!this._isProvided(linksEncoding?.relation)) {
				throw new Error('Invalid encoding: "links.relation.field" is required for semantic graphs.');
			}

			this._validateField(linksEncoding?.relation?.field, `links.relation`)
		}
		

		// Warnings
		if (this._isProvided(linksEncoding?.context) && linkType !== "cooccurrence") {
			console.warn('Ignored encoding: "links.context" is only supported for co-occurrence graphs.');
		}

		if (this._isProvided(linksEncoding?.relation) && linkType !== "semantic") {
			console.warn('Ignored encoding: "links.relation" is only supported for semantic graphs.');
		}
	}
	
}
