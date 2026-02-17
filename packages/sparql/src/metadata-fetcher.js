import { createLogger } from "@wimmics/venus-core"
import { createMetadataSparqlQuery } from "./metadata-query-factory.js"
import { SparqlDataFetcher } from "./sparql-fetcher.js"

const DEFAULT_QUERY_NAMES = ["descriptive", "technical", "relationships"];

/**
 * @typedef {object} NodeDetailsOptions
 * @property {string} endpoint
 * @property {string=} proxyUrl
 * @property {string[]=} queryNames
 * @property {function(string,string=):void=} notify
 * @property {function():void=} onProxyError
 */

export async function fetchNodeDetails(uri, opts) {
  const fetcher = new SparqlDataFetcher()
  const logger = createLogger("MetaFetcher", { debug: true, level: "info" })

  if (!uri) {
    logger.error("No URI provided to fetchNodeDetails()");
    return { status: "error", message: "No URI provided" };
  }

  const endpoint = opts?.endpoint;
  if (!endpoint) {
    logger.error("No endpoint provided to fetchNodeDetails()", { uri });
    return { status: "error", message: "No endpoint provided" };
  }

  const proxyUrl = opts?.proxyUrl;
  const notify = opts?.notify;
  const onProxyError = opts?.onProxyError;
  const queryNames = opts?.queryNames ?? DEFAULT_QUERY_NAMES;

  logger.debug("Fetching node details", { uri, endpoint, proxyUrl, queryNames });

  const allData = Object.fromEntries(queryNames.map((n) => [n, null]));

  // Sequential (simple, preserves existing UX). Switch to allSettled if you want concurrency.
  for (const name of queryNames) {
    let query;
    try {
      query = createMetadataSparqlQuery(name, { uri: uri });
    } catch (e) {
      logger.warn(`Unknown query "${name}"`, { error: e?.message });
      continue;
    }

    try {
      const res = await fetcher.executeSparqlQueryWithFallback(
        endpoint,
        query,
        proxyUrl,
        onProxyError,
        notify
      );
     
      allData[name] = res?.data;
      logger.debug(`Query "${name}" success`, { name, rows: res?.data?.results?.bindings?.length });
    } catch (e) {
      logger.warn(`Query "${name}" failed`, { name, error: e?.message });
      notify?.(`Error while retrieving "${name}" data.`, "error");
    }
  }

  return { status: "success", data: allData };
}
