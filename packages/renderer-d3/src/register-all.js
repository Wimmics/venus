import { registerRenderer } from "./renderer-factory.js";
import ForceGraphRenderer from "./force-graph-renderer.js";
import BarChartRenderer from "./bar-chart-renderer.js";
import { VIS_TYPES } from "@wimmics/kgnovis-core";

// Register known D3 renderers
registerRenderer(VIS_TYPES.FORCE_GRAPH, ForceGraphRenderer);
registerRenderer(VIS_TYPES.BAR_CHART, BarChartRenderer);
