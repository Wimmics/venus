import { ForceGraphEncodingManager } from "./force-graph-encoding-manager.js"
import { BarChartEncodingManager } from "./bar-chart-encoding-manager.js";
import { LineChartEncodingManager } from "./line-chart-encoding-manager.js";
import { ScatterPlotEncodingManager } from "./scatter-plot-encoding-manager.js";

import { VIS_TYPES } from "@wimmics/venus-core";
import { EncodingManager } from "./encoding-manager.js";

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
		default:
		return new EncodingManager()
	}
}