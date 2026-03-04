import { createSparqlMapper } from "@wimmics/venus-mappers";
import { VIS_TYPES } from "@wimmics/venus-core";
import { buildVis } from "./build-vis.js";

export async function buildBarChart({
  endpoint = null,
  query = null,
  jsonData = null,
  proxyUrl = null,
  fetcher = null,
  retries = 0,
  retryDelayMs = 250,
  encoding = null,
  encodingManager = null,
  logger = null
} = {}) {
  const mapper = createSparqlMapper(VIS_TYPES.VENUS_BARCHART);

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
    mapToVis: (raw, { mapper: mapperInstance, encoding: mapping, encodingManager: manager }, log) => {
      if (!mapperInstance?.map) throw new Error('Invalid mapper: expected { map(results, options) }');
      const { chart, meta } = mapperInstance.map(raw, {
        encoding: mapping,
        encodingManager: manager,
        logger: log
      });
      if (!chart) throw new Error('Mapper returned no "chart"');
      log?.debug?.("bar-chart mapped", { rowCount: chart.rows?.length || 0 });
      return { chart, meta };
    }
  });
}
