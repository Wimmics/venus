
import { ALIGN_TYPES, MARK_TYPES, SORT_BY, SORT_MODE, SORT_ORDER, VIS_TYPES, getSupportedChannels } from "@wimmics/venus-core";
import { GraphEncodingManager } from "./graph-encoding-manager.js";

/**
 * Encoding manager for Sankey diagram visualizations.
 * 
 * Validates and merges Sankey-specific encoding specifications. Sankey diagrams
 * visualize flow between categories with node and link structure. Supports opacity
 * encoding for links and sorting configurations for node/link ordering.
 * Extends GraphEncodingManager with Sankey-specific defaults and sort normalization.
 * 
 * @extends GraphEncodingManager
 */
export class SankeyEncodingManager extends GraphEncodingManager {
    
    getChartType() {
        return VIS_TYPES.VENUS_SANKEY;
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

     validateVisSpecificEncoding(userEncoding){
        this._validateNodes(userEncoding);
        this._validateLinks(userEncoding);
        this._validateLayout(userEncoding);
    } 
    
    _validateNodes(userEncoding) {
        
        if (!this._isProvided(userEncoding?.nodes)) {
			throw new Error(`Invalid encoding: "nodes" are required for ${this.getChartType()}.`)
		}

        if (!this._isNonEmptyObject(userEncoding?.nodes)) {
            throw new Error(`Invalid encoding: "nodes" must be a non-empty object containing a "fields" property.`)
        }

        const fields = userEncoding?.nodes?.fields;

        if (!Array.isArray(fields)) {
            throw new Error('Invalid encoding: "nodes.fields" must be an array.');
        }

        if (fields.length < 2) {
            throw new Error('Invalid encoding: "nodes.fields" must contain at least two entries.');
        }

        this._validateSortConfig(userEncoding?.nodes?.sort, "nodes.sort");

        // Validate each value of the fields array
        for (let index = 0; index < fields.length; index++) {
            const item = fields[index];

            if (typeof item === "string") {
                if (!item.trim()) {
                    throw new Error(
                        `Invalid encoding: "nodes.fields[${index}]" must not be an empty string.`
                    );
                }
                continue;
            }

            if (item == null || typeof item !== "object") {
                throw new Error(
                    `Invalid encoding: "nodes.fields[${index}]" must be either a non-empty string or an object.`
                );
            }

            if (typeof item.field !== "string") {
                throw new Error(
                    `Invalid encoding: "nodes.fields[${index}].field" must be a string.`
                );
            }

            if (!item.field.trim()) {
                throw new Error(
                    `Invalid encoding: "nodes.fields[${index}].field" must not be an empty string.`
                );
            }

            if (item.title !== undefined && item.title !== null) {
                if (typeof item.title !== "string") {
                    throw new Error(
                        `Invalid encoding: "nodes.fields[${index}].title" must be a string or null.`
                    );
                }

                if (!item.title.trim()) {
                    throw new Error(
                        `Invalid encoding: "nodes.fields[${index}].title" must not be an empty string.`
                    );
                }
            }

            if (item.color !== undefined) {
                if (item.color == null || typeof item.color !== "object") {
                    throw new Error(
                        `Invalid encoding: "nodes.fields[${index}].color" must be an object.`
                    );
                }
            }

            this._validateSortConfig(
                item.sort,
                `nodes.fields[${index}].sort`
            );
        }

        // Warnings
        if (this._isProvided(userEncoding?.nodes?.field)) {
            console.warn('Ignored encoding: "nodes.field" is not supported for sankey. Use "nodes.fields" instead.');
        }
        
        if (this._isProvided(userEncoding?.nodes?.source) || this._isProvided(userEncoding?.nodes?.target)) {
            console.warn('Ignored encoding: "nodes.source" and "nodes.target" are not supported for sankey. Use "nodes.fields" to define ordered stages.');
        }
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

    
    _validateLinks(userEncoding) {

        if (!this._isProvided(userEncoding?.links)) {
			throw new Error(`Invalid encoding: "links" are required for ${this.getChartType()}.`)
		}

        if (!this._isNonEmptyObject(userEncoding?.links)) {
            throw new Error(`Invalid encoding: "links" must be a non-empty object containing a "value.field" property.`)
        }
        
        const valueField = userEncoding?.links?.value?.field;
        if (this._isProvided(valueField) && !this._isNonEmptyString(valueField)) {
            throw new Error('Invalid encoding: "links.value.field" must be a non-empty string or null.');
        }

        // Warning
        if (this._isProvided(userEncoding?.links?.type)) {
            console.warn('Ignored encoding: "links.type" is not supported for sankey.');
        }
        
        if (this._isProvided(userEncoding?.links?.relation) || this._isProvided(userEncoding?.links?.context)) {
            console.warn('Ignored encoding: "links.relation" and "links.context" are not supported for sankey.');
        }
    }
    
    _validateLayout(userEncoding) {
        const nodePadding = userEncoding?.nodes?.padding;
        if (this._isProvided(nodePadding) && !this._isNonNegativeNumber(nodePadding)) {
            throw new Error('Invalid encoding: "nodes.padding" must be a non-negative number.');
        }

        const align = userEncoding?.nodes?.align;
        if (this._isProvided(align) && !ALIGN_TYPES.includes(align)) {
            console.warn('Ignored encoding: "nodes.align" must be "justify", "left", "right", or "center". Using default.');
        }
    }




    mergeVisSpecificEncoding(encoding = {}, defaults) {
        encoding.nodes ??= {};

        encoding.nodes.sort = this._normalizeSortConfig(
            encoding.nodes.sort,
            {
                by: SORT_BY.LAYOUT,
                order: SORT_ORDER.ASC,
                mode: null
            }
        );

        encoding.nodes.fields = (encoding.nodes.fields || []).map(item => {
            const stage =
                typeof item === "string"
                    ? { field: item }
                    : { ...item };

            stage.sort = this._normalizeSortConfig(
                stage.sort,
                encoding.nodes.sort
            );

            // Apply the common node defaults (color, opacity, etc.)
            const mergedStage = {
                ...defaults.nodes, // default values
                ...encoding.nodes, // global user-defined values
                ...stage // stage-specific user-defined values
            };

            this._mergeChannels(
                mergedStage,
                defaults.nodes,
                {
                    ...encoding.nodes,
                    ...stage
                },
                getSupportedChannels(MARK_TYPES.NODES)
            );

            return mergedStage;
        });
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