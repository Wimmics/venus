
import { SparqlToLineChartMapper } from "./sparql-to-line-chart";
import { SparqlToBarChartMapper } from "./sparql-to-bar-chart";
import { SparqlToScatterPlotMapper } from "./sparql-to-scatter-plot";
import { SparqlToForceGraphMapper } from "./sparql-to-force-graph";
import { SparqlToSankey } from "./sparql-to-sankey";
import { VIS_TYPES } from "@wimmics/venus-core";
import { SparqlToVisMapper } from "./sparql-to-vis-mapper";

/**
 * Factory function to create a SPARQL-to-visualization data mapper for a specific visualization type.
 * Mappers transform SPARQL query results into data structures suitable for visualization rendering.
 *
 * @param {string} visType - The visualization type identifier.
 *   Supported values: 'venus-barchart', 'venus-linechart', 'venus-scatterplot', 'venus-graph', 'venus-sankey'.
 *   See {@link VIS_TYPES} for constants.
 *
 * @param {Object} [options={}] - Configuration options for the mapper (passed to specific mapper classes).
 *
 * @returns {SparqlToVisMapper} A mapper instance configured for the given visualization type.
 *   - For bar charts: {@link SparqlToBarChartMapper}
 *   - For line charts: {@link SparqlToLineChartMapper}
 *   - For scatter plots: {@link SparqlToScatterPlotMapper}
 *   - For node-link graphs: {@link SparqlToForceGraphMapper}
 *   - For sankeys: {@link SparqlToSankey}
 *   - Default: {@link SparqlToVisMapper}
 *
 * @example
 * import { createSparqlMapper } from '@wimmics/venus-transform';
 * import { VIS_TYPES } from '@wimmics/venus-core';
 *
 * const mapper = createSparqlMapper(VIS_TYPES.VENUS_GRAPH);
 * const sparqlResults = { ... }; // From SPARQL endpoint
 * const graphData = mapper.map(sparqlResults);
 * // Returns { nodes: [...], links: [...] }
 */
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
		case VIS_TYPES.VENUS_SANKEY:
			return new SparqlToSankey(options)
		default:
			return new SparqlToVisMapper(options)
	}
}