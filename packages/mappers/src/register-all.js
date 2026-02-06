import { registerSparqlMapper } from "./mapper-factory.js";
import { SparqlToForceGraphMapper } from "./force-graph/sparql-to-force-graph.js";

registerSparqlMapper("force-graph", SparqlToForceGraphMapper);
