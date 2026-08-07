import { ForceGraphEncodingManager } from "./force-graph-encoding-manager.js"
import { SankeyEncodingManager } from "./sankey-encoding-manager.js"
import { BarChartEncodingManager } from "./bar-chart-encoding-manager.js";
import { LineChartEncodingManager } from "./line-chart-encoding-manager.js";
import { ScatterPlotEncodingManager } from "./scatter-plot-encoding-manager.js";

import { VIS_TYPES } from "@wimmics/venus-core";
import { EncodingManager } from "./encoding-manager.js";

/**
 * Factory function to create an encoding manager for a specific visualization type.
 * Encoding managers handle validation, merging, and transformation of visual encoding specifications.
 *
 * @param {string} visType - The visualization type identifier.
 *   Supported values: 'venus-barchart', 'venus-linechart', 'venus-scatterplot', 'venus-graph', 'venus-sankey'.
 *   See {@link VIS_TYPES} for constants.
 *
 * @returns {EncodingManager} An encoding manager instance configured for the given visualization type.
 *   - For bar charts: {@link BarChartEncodingManager}
 *   - For line charts: {@link LineChartEncodingManager}
 *   - For scatter plots: {@link ScatterPlotEncodingManager}
 *   - For node-link graphs: {@link ForceGraphEncodingManager}
 *   - For sankeys: {@link SankeyEncodingManager}
 *   - Default: {@link EncodingManager}
 */
export function createEncodingManager(visType) {
	switch (visType) {
		case VIS_TYPES.VENUS_BARCHART:
			return new BarChartEncodingManager()
		case VIS_TYPES.VENUS_LINECHART:
			return new LineChartEncodingManager()
		case VIS_TYPES.VENUS_SCATTERPLOT:
			return new ScatterPlotEncodingManager()
		case VIS_TYPES.VENUS_GRAPH:
			return new ForceGraphEncodingManager()
		case VIS_TYPES.VENUS_SANKEY:
			return new SankeyEncodingManager()
		default:
			return new EncodingManager()
	}
}