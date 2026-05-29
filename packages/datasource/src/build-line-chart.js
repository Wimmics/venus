import { createSparqlMapper } from "@wimmics/venus-mappers";
import { VIS_TYPES } from "@wimmics/venus-core";
import { buildVis } from "./build-vis.js";

export async function buildLineChart({
  endpoint = null,
  query = null,
  jsonData = null,
  proxyUrl = null,
  fetcher = null,
  retries = 0,
  retryDelayMs = 250,
  encoding = null,
  encodingManager = null,
} = {}) {
  const mapper = createSparqlMapper(VIS_TYPES.VENUS_LINECHART);

  return buildVis({
    endpoint,
    query,
    jsonData,
    proxyUrl,
    fetcher,
    retries,
    retryDelayMs,
    visOptions: { mapper, encoding, encodingManager },
    mapToVis: (raw, { mapper: mapperInstance, encoding: mapping, encodingManager: manager }) => {
      if (!mapperInstance?.map) throw new Error('Invalid mapper: expected { map(results, options) }');
      const { chart, meta } = mapperInstance.map(raw, {
        encoding: mapping,
        encodingManager: manager,
      });
      if (!chart) throw new Error('Mapper returned no "chart"')
      return { chart, meta };
    }
  });
}
