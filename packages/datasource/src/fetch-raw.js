// fetch-raw.js
import { SparqlDataFetcher } from "@wimmics/kgnovis-sparql";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function defaultLogger() {
  return { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
}

function toErrorPayload(e) {
  if (!e) return { message: "Unknown error" };
  return { name: e.name, message: e.message || String(e) };
}

/**
 * Fetch raw SPARQL JSON, with retry.
 *
 * Contract:
 *   fetchRawWithRetry({ endpoint, query, jsonData, proxyUrl, fetcher, retries, retryDelayMs, logger })
 *
 * Returns:
 *   { status, message, method?, raw?, error? }
 */
export async function fetchRawWithRetry({
  endpoint = null,
  query = null,
  jsonData = null,
  proxyUrl = null,
  fetcher = null,
  retries = 0,
  retryDelayMs = 250,
  logger = null
} = {}) {
  const log = logger || defaultLogger();
  const effectiveFetcher = fetcher || new SparqlDataFetcher();

  const attemptMax = Math.max(0, retries) + 1;
  let lastErr = null;

  for (let attempt = 1; attempt <= attemptMax; attempt++) {
    try {
      log.debug?.("fetchRaw attempt", { attempt, attemptMax, hasJsonData: !!jsonData });

      if (jsonData) {
        return {
          status: "success",
          method: "direct-json",
          raw: jsonData,
          message: "Using provided JSON data"
        };
      }

      if (!endpoint || !query) {
        return {
          status: "error",
          message: 'Missing data source. Provide either "jsonData" or ("endpoint" and "query").'
        };
      }

      const res = await effectiveFetcher.fetchSparqlData(endpoint, query, proxyUrl);

      if (!res || res.status !== "success") {
        throw new Error(res?.message || "SPARQL fetch failed");
      }

      return {
        status: "success",
        method: res.method || (proxyUrl ? "proxy" : "direct-endpoint"),
        raw: res.data,
        message: res.message || "SPARQL fetch success"
      };
    } catch (e) {
      lastErr = e;
      const payload = toErrorPayload(e);
      log.warn?.("fetchRaw failed attempt", { attempt, attemptMax, ...payload });

      if (attempt < attemptMax) {
        await sleep(retryDelayMs);
        continue;
      }
    }
  }

  return {
    status: "error",
    message: lastErr?.message || "Failed to fetch raw data",
    error: toErrorPayload(lastErr)
  };
}
