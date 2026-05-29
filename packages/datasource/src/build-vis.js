// build-vis.js
import { fetchRawWithRetry } from "./fetch-raw.js";

/**
 * Template method:
 * - fetch raw SPARQL JSON (shared)
 * - delegate mapping to the provided mapToVis (per visualization)
 */
export async function buildVis({
  // source
  endpoint = null,
  query = null,
  jsonData = null,
  proxyUrl = null,
  fetcher = null,

  // retry
  retries = 0,
  retryDelayMs = 250,

  // per-vis mapping hook (required)
  mapToVis,

  // optional per-vis params
  visOptions = null,
} = {}) {
  if (typeof mapToVis !== "function") {
    return {
      status: "error",
      message: 'buildVis requires a "mapToVis(raw, visOptions)" function.'
    };
  }

  const fetched = await fetchRawWithRetry({
    endpoint,
    query,
    jsonData,
    proxyUrl,
    fetcher,
    retries,
    retryDelayMs
  });

  if (fetched.status !== "success") {
    return fetched;
  }

  const out = await mapToVis(fetched.raw, visOptions);
  return {
    status: "success",
    message: "Visualization data built successfully",
    method: fetched.method,
    raw: fetched.raw,
    ...out
  };
}
