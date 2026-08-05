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
import { GraphEncodingManager } from "./graph-encoding-manager";
import { getSupportedChannels, MARK_TYPES, VIS_TYPES } from "@wimmics/venus-core";

export class ForceGraphEncodingManager extends GraphEncodingManager {

	getChartType() {
		return VIS_TYPES.VENUS_GRAPH
	}

	mergeVisSpecificEncoding(mergedEncoding, defaults, userEncoding){
	
		// Add defaults for semantic and directional graphs, via source and target tags
		if (mergedEncoding.links.type !== "cooccurrence") {
			mergedEncoding.nodes = {
				...mergedEncoding.nodes, // global nodes options
			}

			for (let role of ["source", "target"]) {
				mergedEncoding.nodes[role] = {
					...(defaults.nodes),
					...(userEncoding.nodes?.[role])
				}

				this._mergeChannels(
					mergedEncoding.nodes[role], 
					defaults.nodes, 
					userEncoding.nodes?.[role], 
					getSupportedChannels(MARK_TYPES.NODES)
				)
			}
		}
	}

	_validateGraphSpecificEncoding(merged){
        this._validateSingleScaleConfig(merged);
        this._validateGraphConstructionConfig(merged);
        this._validateNodeMetricConfig(merged);

		this._validateRoleNodeConfig(merged) // Specific force-graph validation
    }   
	
	_validateSingleScaleConfig(encoding) {
		super._validateSingleScaleConfig(encoding)

		// Validate specific force-graph scale config
		for (const role of ["source", "target"]) {
			if (Array.isArray(encoding?.nodes?.[role]?.color)) {
				throw new Error(`Invalid encoding: "nodes.${role}.color" must be an object, not an array.`);
			}
			if (Array.isArray(encoding?.nodes?.[role]?.size)) {
				throw new Error(`Invalid encoding: "nodes.${role}.size" must be an object, not an array.`);
			}
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
				'Invalid encoding: "links.field" is not supported. Use "nodes.source.field" and "nodes.target.field", "links.relation.field", or "links.context.field".'
			);
		}
		const linkType = encoding?.links?.type;
		if (linkType && !["directional", "semantic", "cooccurrence"].includes(linkType)) {
			throw new Error('Invalid encoding: "links.type" must be "directional", "semantic", or "cooccurrence".');
		}
		if (linkType === "cooccurrence") {
			if (!encoding?.nodes?.field && !encoding?.nodes?.fields) {
				throw new Error('Invalid encoding: "nodes.field" or "nodes.fields" is required for co-occurrence graph nodes.');
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
	
}
