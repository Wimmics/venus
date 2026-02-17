import { registerEncodingManager } from "./encoding-manager-factory.js"
import { ForceGraphEncodingManager } from "./force-graph-encoding-manager.js"
import { BarChartEncodingManager } from "./bar-chart-encoding-manager.js";
import { registerVisualArtifactCompiler } from "./visual-artifact-factory.js";
import { createForceGraphVisualArtifacts } from "./force-graph-visual-artifacts.js";
import { createBarChartVisualArtifacts } from "./bar-chart-visual-artifacts.js";
import { VIS_TYPES } from "@wimmics/venus-core";

// Register known encoding managers
registerEncodingManager(VIS_TYPES.FORCE_GRAPH, ForceGraphEncodingManager);
registerVisualArtifactCompiler(VIS_TYPES.FORCE_GRAPH, createForceGraphVisualArtifacts);
registerEncodingManager(VIS_TYPES.BAR_CHART, BarChartEncodingManager);
registerVisualArtifactCompiler(VIS_TYPES.BAR_CHART, createBarChartVisualArtifacts);
