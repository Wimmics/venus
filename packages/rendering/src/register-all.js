import { registerRenderer } from "./renderer-factory.js";
import ForceGraphRenderer from "./force-graph-renderer.js";
import BarChartRenderer from "./bar-chart-renderer.js";
import LineChartRenderer from "./line-chart-renderer.js";
import ScatterPlotRenderer from "./scatter-plot-renderer.js";
import { VIS_TYPES } from "@wimmics/venus-core";

// Register known D3 renderers
registerRenderer(VIS_TYPES.VENUS_GRAPH, ForceGraphRenderer);
registerRenderer(VIS_TYPES.VENUS_BARCHART, BarChartRenderer);
registerRenderer(VIS_TYPES.VENUS_LINECHART, LineChartRenderer);
registerRenderer(VIS_TYPES.VENUS_SCATTERPLOT, ScatterPlotRenderer);
