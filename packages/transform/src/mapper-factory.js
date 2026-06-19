
import { SparqlToLineChartMapper } from "./sparql-to-line-chart";
import { SparqlToBarChartMapper } from "./sparql-to-bar-chart";
import { SparqlToScatterPlotMapper } from "./sparql-to-scatter-plot";
import { SparqlToForceGraphMapper } from "./sparql-to-force-graph";
import { VIS_TYPES } from "@wimmics/venus-core";
import { SparqlToVisMapper } from "./sparql-to-vis-mapper";

export function createSparqlMapper(visType, options = {}) {
	switch(visType){
		case VIS_TYPES.VENUS_BARCHART:
			return new SparqlToBarChartMapper(options)
		case VIS_TYPES.VENUS_LINECHART:
			return new SparqlToLineChartMapper(options)
		case VIS_TYPES.VENUS_SCATTERPLOT:
			return new SparqlToScatterPlotMapper(options)
		case VIS_TYPES.VENUS_GRAPH:
			return new SparqlToForceGraphMapper(options)
		default:
			return new SparqlToVisMapper(options)
	}
}