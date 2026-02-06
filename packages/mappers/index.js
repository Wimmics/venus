
// IMPORTANT: side-effect import that registers all internal mappers.
import "./src/register-all.js";

// Bindings treatment
export { extractId, extractLabel } from "./src/extract-bindings-info.js"

// Mapper methods
export { createSparqlMapper, listSparqlMappers } from "./src/mapper-factory.js"

// Mapper classes
export { SparqlToVisMapper } from "./src/sparql-to-vis-mapper.js"
export { SparqlToForceGraphMapper } from './src/force-graph/sparql-to-force-graph.js'