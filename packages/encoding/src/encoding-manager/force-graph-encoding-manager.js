/**
* Force-Graph Encoding Manager
* 
* Handles encoding logic specific to force-directed graph visualization:
* - Node/link field mappings
* - Adaptive encoding from SPARQL variables
* - Link type resolution (directional, semantic, or co-occurrence)
* - Domain calculation for nodes and links
* - D3 scale creation
*/
import { EncodingManager } from "./encoding-manager.js";
import { getDefaultEncodingTemplate } from "../default-encodings.js";

export class ForceGraphEncodingManager extends EncodingManager {
	/**
	* Get the default encoding template for force-graph visualization.
	* @returns {Object} Default force-graph encoding config
	*/
	getDefaultEncoding() {
		return getDefaultEncodingTemplate("force-graph");
	}
	
	mergeEncoding(userEncoding) {
		return this._mergeGraphEncoding(userEncoding);
	}
	
	validateChartSpecificEncoding(merged) {
		this._validateGraphConstructionConfig(merged);
		this._validateSingleScaleConfig(merged);
		this._validateNodeMetricConfig(merged);
		this._validateRoleNodeConfig(merged);
	}
	
	_mergeGraphEncoding(userEncoding) {
		const defaults = this.getDefaultEncoding();
		console.log("defaults =", defaults)



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
		for (const role of ["source", "target"]) {
			if (Array.isArray(encoding?.nodes?.[role]?.color)) {
				throw new Error(`Invalid encoding: "nodes.${role}.color" must be an object, not an array.`);
			}
			if (Array.isArray(encoding?.nodes?.[role]?.size)) {
				throw new Error(`Invalid encoding: "nodes.${role}.size" must be an object, not an array.`);
			}
		}
		if (Array.isArray(encoding?.links?.color)) {
			throw new Error('Invalid encoding: "links.color" must be an object, not an array.');
		}
	}
	
	_validateNodeMetricConfig(encoding) {
		const validateMetric = (channel, key) => {
			if (channel?.metric === undefined) return;
			if (channel.metric !== "degree") {
				throw new Error(`Invalid encoding: "${key}.metric" must be "degree" when provided.`);
			}
			if (channel.field !== undefined) {
				throw new Error(`Invalid encoding: "${key}" cannot define both "field" and "metric".`);
			}
		};
		
		validateMetric(encoding?.nodes?.color, "nodes.color");
		validateMetric(encoding?.nodes?.size, "nodes.size");
		validateMetric(encoding?.nodes?.source?.color, "nodes.source.color");
		validateMetric(encoding?.nodes?.target?.color, "nodes.target.color");
		validateMetric(encoding?.nodes?.source?.size, "nodes.source.size");
		validateMetric(encoding?.nodes?.target?.size, "nodes.target.size");
		
		const metricColorScaleType = encoding?.nodes?.color?.scale?.type;
		if (
			encoding?.nodes?.color?.metric !== undefined &&
			metricColorScaleType !== undefined &&
			metricColorScaleType !== "quantitative" &&
			metricColorScaleType !== "sequential"
		) {
			throw new Error(
				'Invalid encoding: "nodes.color.scale.type" must be "quantitative" or "sequential" for metric color.'
			);
		}
		
		if (encoding?.links?.color?.metric !== undefined) {
			throw new Error('Invalid encoding: "links.color.metric" is not supported.');
		}
	}
	
	_validateGraphConstructionConfig(encoding) {
		if (encoding?.links?.field !== undefined) {
			throw new Error(
				'Invalid encoding: "links.field" is no longer supported. Use "nodes.source.field" and "nodes.target.field", "links.relation.field", or "links.context.field".'
			);
		}
		const linkType = encoding?.links?.type;
		if (linkType && !["directional", "semantic", "cooccurrence"].includes(linkType)) {
			throw new Error('Invalid encoding: "links.type" must be "directional", "semantic", or "cooccurrence".');
		}
		if (linkType === "cooccurrence") {
			if (!encoding?.nodes?.field) {
				throw new Error('Invalid encoding: "nodes.field" is required for co-occurrence graph nodes.');
			}
			if (typeof encoding?.links?.context?.field !== "string" || !encoding.links.context.field.trim()) {
				throw new Error('Invalid encoding: "links.context.field" is required for co-occurrence links.');
			}
			return;
		}
		if (encoding?.links?.context !== undefined && linkType !== "cooccurrence") {
			throw new Error('Invalid encoding: "links.context" is only supported for co-occurrence links.');
		}
		if (!encoding?.nodes?.source?.field || !encoding?.nodes?.target?.field) {
			throw new Error(
				'Invalid encoding: "nodes.source.field" and "nodes.target.field" are required for directional and semantic graph links.'
			);
		}
		if ((linkType === "semantic" || encoding?.links?.relation !== undefined) && (
			typeof encoding?.links?.relation?.field !== "string" ||
			!encoding.links.relation.field.trim()
		)) {
			throw new Error('Invalid encoding: "links.relation.field" is required for semantic links.');
		}
	}
	
	_validateRoleNodeConfig(encoding) {
		const validateRole = (role) => {
			const config = encoding?.nodes?.[role];
			if (!config) return;
			const supportedKeys = new Set(["field", "color", "size", "labels", "stroke", "tooltip"]);
			const unsupportedKeys = Object.keys(config).filter((key) => !supportedKeys.has(key));
			if (unsupportedKeys.length) {
				throw new Error(`Invalid encoding: "nodes.${role}" has unsupported properties: ${unsupportedKeys.join(", ")}.`);
			}
		};
		
		validateRole("source");
		validateRole("target");
	}
	
	resolveNodeChannelDataKey(channelEncoding) {
		if (typeof channelEncoding?.field === "string" && channelEncoding.field.trim()) {
			return channelEncoding.field;
		}
		if (channelEncoding?.metric === "degree") {
			return "degree";
		}
		return null;
	}
	
	// /**
	// * Populate domain fields in the encoding based on node data.
	// * Calculates domains for node color and size fields.
	// * @param {Object} encoding - Current encoding config
	// * @param {Object[]} nodes - Node data to calculate domains from
	// * @returns {Object} Encoding enriched with calculated domains
	// */
	// populateDomainsFromData(encoding, nodes, links = null) {
	// 	if (!nodes?.length) return encoding;
		
	// 	const enc = JSON.parse(JSON.stringify(encoding));
	// 	const linkData = Array.isArray(links) ? links : [];
		
	// 	// Nodes color domain (single config)
	// 	const nodeColorEncoding = enc.nodes?.color;
	// 	const nodeColorKey = this.resolveNodeChannelDataKey(nodeColorEncoding);
	// 	if (nodeColorKey && nodeColorEncoding?.scale) {
	// 		const scaleType = nodeColorEncoding.scale.type || (nodeColorEncoding.metric ? "sequential" : "ordinal");
	// 		const userDomain = nodeColorEncoding.scale.domain;
	// 		nodeColorEncoding.scale.domain = this.domainCalculator.getDomain(nodes, nodeColorKey, userDomain, scaleType);
	// 		enc.nodes.color = nodeColorEncoding;
	// 	}
		
	// 	// Links color domain (single config)
	// 	if (linkData.length) {
	// 		const linkColorEncoding = enc.links?.color;
	// 		if (linkColorEncoding?.field && linkColorEncoding?.scale) {
	// 			const scaleType = linkColorEncoding.scale.type || "ordinal";
	// 			const userDomain = linkColorEncoding.scale.domain;
	// 			linkColorEncoding.scale.domain = this.domainCalculator.getDomain(linkData, linkColorEncoding.field, userDomain, scaleType);
	// 			enc.links.color = linkColorEncoding;
	// 		}
	// 	}
		
	// 	// Nodes size domain (single config)
	// 	const nodeSizeEncoding = enc.nodes?.size;
	// 	const nodeSizeKey = this.resolveNodeChannelDataKey(nodeSizeEncoding);
	// 	if (nodeSizeKey && nodeSizeEncoding?.scale) {
	// 		const field = nodeSizeKey;
	// 		const scaleType = nodeSizeEncoding.scale.type || "linear";
	// 		const userDomain = nodeSizeEncoding.scale.domain;
	// 		const userRange = nodeSizeEncoding.scale.range;
	// 		nodeSizeEncoding.scale.domain = this.domainCalculator.getDomain(nodes, field, userDomain, scaleType);
	// 		if (this.sizeRangeCalculator) {
	// 			nodeSizeEncoding.scale.range = this.sizeRangeCalculator.createSizeRange({
	// 				data: nodes,
	// 				field,
	// 				scaleType,
	// 				range: userRange,
	// 				label: `Size[${field}]`
	// 			});
	// 		}
	// 		enc.nodes.size = nodeSizeEncoding;
	// 	}
		
	// 	return enc;
	// }
	
}
