// build-vis.js
import { fetchRawWithRetry } from "./fetch-raw.js";

function defaultLogger() {
  return { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
}

function toErrorPayload(e) {
  if (!e) return { message: "Unknown error" };
  return { name: e.name, message: e.message || String(e) };
}

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

  // logging
  logger = null
} = {}) {
  const log = logger || defaultLogger();

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
    retryDelayMs,
    logger: log
  });

  if (fetched.status !== "success") {
    return fetched;
  }

  try {
    const out = await mapToVis(fetched.raw, visOptions, log);
    return {
      status: "success",
      message: "Visualization data built successfully",
      method: fetched.method,
      raw: fetched.raw,
      ...out
    };
  } catch (e) {
    log.error?.("mapToVis failed", { message: e?.message });
    return {
      status: "error",
      message: e?.message || "Failed to map raw data to visualization format",
      error: toErrorPayload(e)
    };
  }
}
