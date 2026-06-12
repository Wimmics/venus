import { registerSparqlMapper } from "./mapper-factory.js";
import { SparqlToForceGraphMapper } from "./sparql-to-force-graph.js";
import { SparqlToBarChartMapper } from "./sparql-to-bar-chart.js";
import { SparqlToLineChartMapper } from "./sparql-to-line-chart.js";
import { SparqlToScatterPlotMapper } from "./sparql-to-scatter-plot.js";
import { VIS_TYPES } from "@wimmics/venus-core";

registerSparqlMapper(VIS_TYPES.VENUS_GRAPH, SparqlToForceGraphMapper);
registerSparqlMapper(VIS_TYPES.VENUS_BARCHART, SparqlToBarChartMapper);
registerSparqlMapper(VIS_TYPES.VENUS_LINECHART, SparqlToLineChartMapper);
registerSparqlMapper(VIS_TYPES.VENUS_SCATTERPLOT, SparqlToScatterPlotMapper);
