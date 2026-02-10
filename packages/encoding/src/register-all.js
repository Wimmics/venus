import { registerEncodingManager } from "./encoding-manager-factory.js"
import { ForceGraphEncodingManager } from "./force-graph-encoding-manager.js"
import { registerVisualArtifactCompiler } from "./visual-artifact-factory.js";
import { createForceGraphVisualArtifacts } from "./force-graph-visual-artifacts.js";

// Register known encoding managers
registerEncodingManager("force-graph", ForceGraphEncodingManager);
registerVisualArtifactCompiler("force-graph", createForceGraphVisualArtifacts);
