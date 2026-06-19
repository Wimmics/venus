
import { VIS_TYPES } from "@wimmics/venus-core";
import { GraphEncodingManager } from "./graph-encoding-manager.js";

export class SankeyEncodingManager extends GraphEncodingManager {
    
    getChartType() {
        return VIS_TYPES.VENUS_SANKEY;
    }
    
    validateReferencedFields(encoding, sparqlVars = []) {
        super.validateReferencedFields(encoding, sparqlVars);
        
        if (!Array.isArray(sparqlVars) || sparqlVars.length === 0) return;
        
        const nodeFields = encoding?.nodes?.fields || [];
        for (const [index, field] of nodeFields.entries()) {
            if (!sparqlVars.includes(field)) {
                throw new Error(
                    `Invalid encoding: "nodes.fields[${index}]" references unknown SPARQL variable "${field}". Available variables are: ${sparqlVars.join(", ")}.`
                );
            }
        }
        
        const valueField = encoding?.links?.value?.field;
        if (typeof valueField === "string" && valueField.trim() && !sparqlVars.includes(valueField)) {
            throw new Error(
                `Invalid encoding: "links.value.field" references unknown SPARQL variable "${valueField}". Available variables are: ${sparqlVars.join(", ")}.`
            );
        }
    }

     _validateGraphSpecificEncoding(merged){
        this._validateSingleScaleConfig(merged);
        this._validateGraphConstructionConfig(merged);

        this._validateSankeyValueConfig(merged);
        this._validateSankeyLayoutConfig(merged);
        this._validateUnsupportedGraphConfig(merged);
    } 
    
    _validateGraphConstructionConfig(encoding) {
        const fields = encoding?.nodes?.fields;
        
        if (!Array.isArray(fields) || fields.length < 2) {
            throw new Error('Invalid encoding: "nodes.fields" must be an array with at least two field names.');
        }
        
        const invalid = fields.find((field) => typeof field !== "string" || !field.trim());
        if (invalid !== undefined) {
            throw new Error('Invalid encoding: "nodes.fields" must contain non-empty strings only.');
        }
    }
    
    _validateNodeMetricConfig(encoding) {
        if (encoding?.nodes?.color?.metric !== undefined) {
            throw new Error('Invalid encoding: "nodes.color.metric" is not supported for sankey. Use "nodes.color.field" or "nodes.color.value".');
        }
        
        if (encoding?.links?.color?.metric !== undefined) {
            throw new Error('Invalid encoding: "links.color.metric" is not supported for sankey. Use "links.color.field" or "links.color.value".');
        }
    }
    
    _validateSankeyValueConfig(encoding) {
        const valueConfig = encoding?.links?.value || {};
        const aggregate = valueConfig?.aggregate == null
        ? "count"
        : String(valueConfig.aggregate).toLowerCase().trim();
        
        if (!["count", "sum"].includes(aggregate)) {
            throw new Error('Invalid encoding: "links.value.aggregate" must be "count" or "sum".');
        }
        
        const valueField = valueConfig?.field;
        if (
            valueField !== null &&
            valueField !== undefined &&
            (typeof valueField !== "string" || !valueField.trim())
        ) {
            throw new Error('Invalid encoding: "links.value.field" must be a non-empty string or null.');
        }
        
        if (aggregate === "sum" && (!valueField || !String(valueField).trim())) {
            throw new Error('Invalid encoding: "links.value.field" is required when "links.value.aggregate" is "sum".');
        }
    }
    
    _validateSankeyLayoutConfig(encoding) {
        const align = encoding?.nodes?.align;
        if (align !== undefined && !["justify", "left", "right", "center"].includes(align)) {
            throw new Error('Invalid encoding: "nodes.align" must be "justify", "left", "right", or "center".');
        }
        
        const nodeWidth = encoding?.nodes?.width;
        if (nodeWidth !== undefined && (!Number.isFinite(nodeWidth) || nodeWidth <= 0)) {
            throw new Error('Invalid encoding: "nodes.width" must be a positive number.');
        }
        
        const nodePadding = encoding?.nodes?.padding;
        if (nodePadding !== undefined && (!Number.isFinite(nodePadding) || nodePadding < 0)) {
            throw new Error('Invalid encoding: "nodes.padding" must be a non-negative number.');
        }
        
        const opacity = encoding?.links?.opacity?.value;
        if (opacity !== undefined && (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)) {
            throw new Error('Invalid encoding: "links.opacity.value" must be a number between 0 and 1.');
        }
    }
    
    _validateUnsupportedGraphConfig(encoding) {
        if (encoding?.nodes?.field !== undefined) {
            throw new Error('Invalid encoding: "nodes.field" is not supported for sankey. Use "nodes.fields".');
        }
        
        if (encoding?.nodes?.source !== undefined || encoding?.nodes?.target !== undefined) {
            throw new Error('Invalid encoding: "nodes.source" and "nodes.target" are not supported for sankey. Use "nodes.fields" to define ordered stages.');
        }
        
        if (encoding?.links?.type !== undefined) {
            throw new Error('Invalid encoding: "links.type" is not supported for sankey.');
        }
        
        if (encoding?.links?.relation !== undefined || encoding?.links?.context !== undefined) {
            throw new Error('Invalid encoding: "links.relation" and "links.context" are not supported for sankey.');
        }
    }
}