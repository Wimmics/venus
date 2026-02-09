import { registerEncodingManager } from "./encoding-manager-factory.js"
import { ForceGraphEncodingManager } from "./force-graph-encoding-manager.js"

// Register known encoding managers
registerEncodingManager("force-graph", ForceGraphEncodingManager);
