
import { SORT_BY, SORT_MODE, SORT_ORDER, VIS_TYPES } from "@wimmics/venus-core";
import { GraphEncodingManager } from "./graph-encoding-manager.js";

export class SankeyEncodingManager extends GraphEncodingManager {
    
    getChartType() {
        return VIS_TYPES.VENUS_SANKEY;
    }

    mergeEncoding(userEncoding) {
        const merged = super.mergeEncoding(userEncoding);
        return this._normalizeSankeySortConfig(merged);
    }
    
    validateReferencedFields(encoding, sparqlVars = []) {
        super.validateReferencedFields(encoding, sparqlVars);
        
        if (!Array.isArray(sparqlVars) || sparqlVars.length === 0) return;
        
        const nodeFields = encoding?.nodes?.fields || [];
        for (const [index, item] of nodeFields.entries()) {
            const field = typeof item === "string" ? item : item?.field;

            if (!sparqlVars.includes(field)) {
                throw new Error(
                    `Invalid encoding: "nodes.fields[${index}]" references unknown SPARQL variable "${field}". Available variables are: ${sparqlVars.join(", ")}.`
                );
            }

            const stageColorField =
                typeof item === "object" && item?.color && typeof item.color.field === "string"
                    ? item.color.field
                    : null;

            if (stageColorField && !sparqlVars.includes(stageColorField)) {
                throw new Error(
                    `Invalid encoding: "nodes.fields[${index}].color.field" references unknown SPARQL variable "${stageColorField}". Available variables are: ${sparqlVars.join(", ")}.`
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
            throw new Error('Invalid encoding: "nodes.fields" must be an array with at least two entries.');
        }

        this._validateSortConfig(encoding?.nodes?.sort, 'nodes.sort');

        const invalid = fields.find((item, index) => {
            if (typeof item === "string") return !item.trim();
            if (!item || typeof item !== "object") return true;
            if (typeof item.field !== "string" || !item.field.trim()) return true;

            if (item.title !== undefined && (typeof item.title !== "string" || !item.title.trim())) {
                return true;
            }

            if (item.color !== undefined && (item.color == null || typeof item.color !== "object")) {
                return true;
            }

            this._validateSortConfig(item.sort, `nodes.fields[${index}].sort`);

            return false;
        });

        if (invalid !== undefined) {
            throw new Error('Invalid encoding: "nodes.fields" entries must be non-empty strings or objects shaped like { field, title?, color?, sort? }.');
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
        
        const valueField = encoding?.links?.value?.field;
        if (
            valueField !== null &&
            valueField !== undefined &&
            (typeof valueField !== "string" || !valueField.trim())
        ) {
            throw new Error('Invalid encoding: "links.value.field" must be a non-empty string or null.');
        }
    }
    
    _validateSankeyLayoutConfig(encoding) {
        const align = encoding?.nodes?.align;
        if (align !== undefined && !["justify", "left", "right", "center"].includes(align)) {
            throw new Error('Invalid encoding: "nodes.align" must be "justify", "left", "right", or "center".');
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

    _normalizeSankeySortConfig(encoding = {}) {
        const nodes = encoding?.nodes || {};
        const normalizedGlobalSort = this._normalizeSortConfig(nodes.sort, {
            by: SORT_BY.LAYOUT,
            order: SORT_ORDER.ASC,
            mode: null
        });

        const normalizedFields = (nodes.fields || []).map((item) => {
            if (typeof item === "string") return item;
            if (!item || typeof item !== "object") return item;

            return {
                ...item,
                ...(item.sort !== undefined
                    ? { sort: this._normalizeSortConfig(item.sort, normalizedGlobalSort) }
                    : {})
            };
        });

        return {
            ...encoding,
            nodes: {
                ...nodes,
                sort: normalizedGlobalSort,
                fields: normalizedFields
            }
        };
    }

    _validateSortConfig(config, path) {
        if (config === undefined || config === null) return;

        if (typeof config === "string") {
            const by = config.trim().toLowerCase();
            const validBy = new Set(Object.values(SORT_BY));

            if (!validBy.has(by)) {
                throw new Error(
                    `Invalid encoding: "${path}" must be one of ${Array.from(validBy).join(", ")} or an object { by, order?, mode? }.`
                );
            }

            return;
        }

        if (typeof config !== "object") {
            throw new Error(`Invalid encoding: "${path}" must be a string or an object.`);
        }

        const by = typeof config.by === "string" ? config.by.trim().toLowerCase() : null;
        const order = typeof config.order === "string" ? config.order.trim().toLowerCase() : null;
        const mode = typeof config.mode === "string" ? config.mode.trim().toLowerCase() : null;

        const validBy = new Set(Object.values(SORT_BY));
        const validOrder = new Set(Object.values(SORT_ORDER));
        const validMode = new Set(Object.values(SORT_MODE));

        if (!by || !validBy.has(by)) {
            throw new Error(
                `Invalid encoding: "${path}.by" must be one of ${Array.from(validBy).join(", ")}.`
            );
        }

        if (order && !validOrder.has(order)) {
            throw new Error(
                `Invalid encoding: "${path}.order" must be one of ${Array.from(validOrder).join(", ")}.`
            );
        }

        if (mode && !validMode.has(mode)) {
            throw new Error(
                `Invalid encoding: "${path}.mode" must be one of ${Array.from(validMode).join(", ")}.`
            );
        }

        if ((by === SORT_BY.ALPHA || by === SORT_BY.LAYOUT) && mode) {
            throw new Error(
                `Invalid encoding: "${path}.mode" is only allowed when "${path}.by" is "${SORT_BY.COUNT}" or "${SORT_BY.VALUE}".`
            );
        }
    }

    _normalizeSortConfig(config, fallback = null) {
        if (config === undefined || config === null) {
            return fallback
                ? { ...fallback }
                : {
                    by: SORT_BY.LAYOUT,
                    order: SORT_ORDER.ASC,
                    mode: null
                };
        }

        if (typeof config === "string") {
            const by = config.trim().toLowerCase();
            const order = by === SORT_BY.ALPHA ? SORT_ORDER.ASC : SORT_ORDER.DESC;

            return {
                by,
                order: by === SORT_BY.LAYOUT ? SORT_ORDER.ASC : order,
                mode: by === SORT_BY.COUNT || by === SORT_BY.VALUE ? SORT_MODE.TOTAL : null
            };
        }

        const by = typeof config.by === "string" && config.by.trim()
            ? config.by.trim().toLowerCase()
            : fallback?.by || SORT_BY.LAYOUT;

        const order = typeof config.order === "string" && config.order.trim()
            ? config.order.trim().toLowerCase()
            : (by === SORT_BY.ALPHA ? SORT_ORDER.ASC : SORT_ORDER.DESC);

        const mode = typeof config.mode === "string" && config.mode.trim()
            ? config.mode.trim().toLowerCase()
            : SORT_MODE.TOTAL;

        return {
            by,
            order: by === SORT_BY.LAYOUT ? SORT_ORDER.ASC : order,
            mode: by === SORT_BY.COUNT || by === SORT_BY.VALUE ? mode : null
        };
    }
}