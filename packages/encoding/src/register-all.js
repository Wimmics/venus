import { registerEncodingManager } from "./encoding-manager-factory.js"
import { ForceGraphEncodingManager } from "./force-graph-encoding-manager.js"
import { BarChartEncodingManager } from "./bar-chart-encoding-manager.js";
import { LineChartEncodingManager } from "./line-chart-encoding-manager.js";
import { ScatterPlotEncodingManager } from "./scatter-plot-encoding-manager.js";

import { VIS_TYPES } from "@wimmics/venus-core";

// Register known encoding managers
registerEncodingManager(VIS_TYPES.VENUS_GRAPH, ForceGraphEncodingManager);
registerEncodingManager(VIS_TYPES.VENUS_BARCHART, BarChartEncodingManager);
registerEncodingManager(VIS_TYPES.VENUS_LINECHART, LineChartEncodingManager);
registerEncodingManager(VIS_TYPES.VENUS_SCATTERPLOT, ScatterPlotEncodingManager);
