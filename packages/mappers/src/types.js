/**
 * @typedef {Object} MapContext
 * @property {any} encoding - Normalized and validated encoding.
 */

/**
 * @typedef {Object} MapResult
 * @property {CanonicalGraph} graph
 * @property {Object} meta
 * @property {Array<string>} meta.vars
 * @property {Object} meta.mappingResolved
 * @property {string|null} meta.mappingResolved.sourceVar
 * @property {string|null} meta.mappingResolved.targetVar
 * @property {Array<string>} meta.mappingResolved.sourceVars
 * @property {Array<string>} meta.mappingResolved.targetVars
 * @property {"directional"|"semantic"|"cooccurrence"} meta.mappingResolved.linkType
 * @property {string|null} meta.mappingResolved.relationVar
 * @property {string|null} meta.mappingResolved.contextVar
 * @property {any} meta.encodingUsed
 */