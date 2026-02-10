import { registerRenderer } from "./renderer-factory.js";
import ForceGraphRenderer from "./force-graph-renderer.js";

// Register known D3 renderers
registerRenderer("force-graph", ForceGraphRenderer);

