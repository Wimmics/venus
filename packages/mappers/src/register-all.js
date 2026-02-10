import { registerSparqlMapper } from "./mapper-factory.js";
import { SparqlToForceGraphMapper } from "./force-graph/sparql-to-force-graph.js";
import { SparqlToBarChartMapper } from "./bar-chart/sparql-to-bar-chart.js";
import { VIS_TYPES } from "@wimmics/kgnovis-core";

registerSparqlMapper(VIS_TYPES.FORCE_GRAPH, SparqlToForceGraphMapper);
registerSparqlMapper(VIS_TYPES.BAR_CHART, SparqlToBarChartMapper);
