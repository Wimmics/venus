
// IMPORTANT: side-effect import that registers all internal mappers.
import "./src/register-all.js";

// Bindings treatment
export { bindingToValue, extractId, resolveBindingLabel } from "./src/extract-bindings-info.js"

// Mapper methods
export { createSparqlMapper, listSparqlMappers } from "./src/mapper-factory.js"

// Mapper classes
export { SparqlToVisMapper } from "./src/sparql-to-vis-mapper.js"

export { SparqlToForceGraphMapper } from './src/sparql-to-force-graph.js'
export { SparqlToBarChartMapper } from "./src/sparql-to-bar-chart.js";
export { SparqlToLineChartMapper } from "./src/sparql-to-line-chart.js";
export { SparqlToScatterPlotMapper } from "./src/sparql-to-scatter-plot.js";
