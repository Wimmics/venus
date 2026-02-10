import { registerSparqlMapper } from "./mapper-factory.js";
import { SparqlToForceGraphMapper } from "./force-graph/sparql-to-force-graph.js";
import { VIS_TYPES } from "@wimmics/kgnovis-core";

registerSparqlMapper(VIS_TYPES.FORCE_GRAPH, SparqlToForceGraphMapper);
