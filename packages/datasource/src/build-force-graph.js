// build-force-graph.js
import { createSparqlMapper } from "@wimmics/venus-mappers";
import { VIS_TYPES } from "@wimmics/venus-core";
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
} = {}) {
	const mapper = createSparqlMapper(VIS_TYPES.VENUS_GRAPH);
	
	return buildVis({
		endpoint,
		query,
		jsonData,
		proxyUrl,
		fetcher,
		retries,
		retryDelayMs,
		
		visOptions: { mapper, encoding, encodingManager },
		
		mapToVis: (raw, { mapper, encoding, encodingManager }) => {
			if (!mapper?.map) throw new Error('Invalid mapper: expected { map(results, options) }');
			const { graph, meta } = mapper.map(raw, {
				encoding,
				encodingManager,
			});
			if (!graph) throw new Error('Mapper returned no "graph"');
			return { graph, meta };
		}
	});
}
