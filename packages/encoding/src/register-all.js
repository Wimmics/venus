import { registerEncodingManager } from "./encoding-manager-factory.js"
import { ForceGraphEncodingManager } from "./force-graph-encoding-manager.js"
import { registerVisualArtifactCompiler } from "./visual-artifact-factory.js";
import { createForceGraphVisualArtifacts } from "./force-graph-visual-artifacts.js";
import { VIS_TYPES } from "@wimmics/kgnovis-core";

// Register known encoding managers
registerEncodingManager(VIS_TYPES.FORCE_GRAPH, ForceGraphEncodingManager);
registerVisualArtifactCompiler(VIS_TYPES.FORCE_GRAPH, createForceGraphVisualArtifacts);
