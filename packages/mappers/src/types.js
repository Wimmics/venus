/**
 * @typedef {Object} MapContext
 * @property {any} encoding
 * @property {any} defaultEncoding
 * @property {(vars: string[]) => any} createAdaptiveEncoding
 * @property {(mapping: any, vars: string[]) => ({sourceVar: string, targetVar: (string|null), linkType: string})} resolveFieldMapping
 * @property {{ debug?: Function, info?: Function, warn?: Function, error?: Function }} [logger]
 */


/**
 * @typedef {Object} MapResult
 * @property {CanonicalGraph} graph
 * @property {Object} meta
 * @property {boolean} meta.usedAdaptiveEncoding
 * @property {Array<string>} meta.vars
 * @property {Object} meta.mappingResolved
 * @property {string} meta.mappingResolved.sourceVar
 * @property {string|null} meta.mappingResolved.targetVar
 * @property {"directional"|"semantic"} meta.mappingResolved.linkType
 * @property {string|null} meta.mappingResolved.semanticVar
 */
