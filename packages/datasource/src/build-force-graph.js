// build-force-graph.js
import { createSparqlMapper } from "@wimmics/kgnovis-mappers";
import { buildVis } from "./build-vis.js";

/**
 * Force-graph builder.
 *
 * Returns:
 *   { graph: {nodes, links}, meta }
 */
export async function buildForceGraph({
  endpoint = null,
  query = null,
  jsonData = null,
  proxyUrl = null,
  fetcher = null,
  retries = 0,
  retryDelayMs = 250,
  // vis-specific encoding options
  encoding = null,
  encodingManager = null,
  
  logger = null
} = {}) {
  const mapper = createSparqlMapper("force-graph");

  return buildVis({
    endpoint,
    query,
    jsonData,
    proxyUrl,
    fetcher,
    retries,
    retryDelayMs,
    logger,

    visOptions: { mapper, encoding, encodingManager },

    mapToVis: (raw, { mapper, encoding, encodingManager }, log) => {
      if (!mapper?.map) throw new Error('Invalid mapper: expected { map(results, options) }');
      const { graph, meta } = mapper.map(raw, {
        encoding,
        encodingManager,
        logger: log
      });
      if (!graph) throw new Error('Mapper returned no "graph"');
      log?.debug?.("force-graph mapped", { nodeCount: graph.nodes?.length, linkCount: graph.links?.length });
      return { graph, meta };
    }
  });
}
