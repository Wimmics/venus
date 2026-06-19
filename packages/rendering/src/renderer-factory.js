import ForceGraphRenderer from "./force-graph-renderer.js";
import { SankeyRenderer } from "./sankey-renderer.js";
import BarChartRenderer from "./bar-chart-renderer.js";
import LineChartRenderer from "./line-chart-renderer.js";
import ScatterPlotRenderer from "./scatter-plot-renderer.js";
import BaseRenderer from "./base-renderer.js";

import { VIS_TYPES } from "@wimmics/venus-core";


export function createRenderer(visType, options = {}) {
	switch (visType){
		case VIS_TYPES.VENUS_BARCHART:
			return new BarChartRenderer(options)
		case VIS_TYPES.VENUS_LINECHART:
			return new LineChartRenderer(options)
		case VIS_TYPES.VENUS_SCATTERPLOT:
			return new ScatterPlotRenderer(options)
		case VIS_TYPES.VENUS_GRAPH:
			return new ForceGraphRenderer(options)
		case VIS_TYPES.VENUS_SANKEY:
			return new SankeyRenderer(options)
		default:
			return new BaseRenderer(options)
	}
}

