import { registerSparqlMapper } from "./mapper-factory.js";
import { SparqlToForceGraphMapper } from "./force-graph/sparql-to-force-graph.js";
import { SparqlToBarChartMapper } from "./bar-chart/sparql-to-bar-chart.js";
import { SparqlToLineChartMapper } from "./line-chart/sparql-to-line-chart.js";
import { VIS_TYPES } from "@wimmics/venus-core";

registerSparqlMapper(VIS_TYPES.VENUS_GRAPH, SparqlToForceGraphMapper);
registerSparqlMapper(VIS_TYPES.VENUS_BARCHART, SparqlToBarChartMapper);
registerSparqlMapper(VIS_TYPES.VENUS_LINECHART, SparqlToLineChartMapper);
