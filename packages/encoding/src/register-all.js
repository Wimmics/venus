import { registerEncodingManager } from "./encoding-manager-factory.js"
import { ForceGraphEncodingManager } from "./force-graph-encoding-manager.js"
import { BarChartEncodingManager } from "./bar-chart-encoding-manager.js";
import { LineChartEncodingManager } from "./line-chart-encoding-manager.js";
import { ScatterPlotEncodingManager } from "./scatter-plot-encoding-manager.js";
import { registerVisualArtifactCompiler } from "./visual-artifact-factory.js";
import { createForceGraphVisualArtifacts } from "./force-graph-visual-artifacts.js";
import { createBarChartVisualArtifacts } from "./bar-chart-visual-artifacts.js";
import { createLineChartVisualArtifacts } from "./line-chart-visual-artifacts.js";
import { createScatterPlotVisualArtifacts } from "./scatter-plot-visual-artifacts.js";
import { VIS_TYPES } from "@wimmics/venus-core";

// Register known encoding managers
registerEncodingManager(VIS_TYPES.VENUS_GRAPH, ForceGraphEncodingManager);
registerVisualArtifactCompiler(VIS_TYPES.VENUS_GRAPH, createForceGraphVisualArtifacts);
registerEncodingManager(VIS_TYPES.VENUS_BARCHART, BarChartEncodingManager);
registerVisualArtifactCompiler(VIS_TYPES.VENUS_BARCHART, createBarChartVisualArtifacts);
registerEncodingManager(VIS_TYPES.VENUS_LINECHART, LineChartEncodingManager);
registerVisualArtifactCompiler(VIS_TYPES.VENUS_LINECHART, createLineChartVisualArtifacts);
registerEncodingManager(VIS_TYPES.VENUS_SCATTERPLOT, ScatterPlotEncodingManager);
registerVisualArtifactCompiler(VIS_TYPES.VENUS_SCATTERPLOT, createScatterPlotVisualArtifacts);
