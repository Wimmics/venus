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

  if (!uri) {
    throw new Error("No URI provided to fetchNodeDetails().")
  }

  const endpoint = opts?.endpoint;
  if (!endpoint) {
    throw new Error("No endpoint provided to fetchNodeDetails()")
  }

  const proxyUrl = opts?.proxyUrl;
  const notify = opts?.notify;
  const onProxyError = opts?.onProxyError;
  const queryNames = opts?.queryNames ?? DEFAULT_QUERY_NAMES;

  const allData = Object.fromEntries(queryNames.map((n) => [n, null]));

  // Sequential (simple, preserves existing UX). Switch to allSettled if you want concurrency.
  for (const name of queryNames) {
    let query = createMetadataSparqlQuery(name, { uri: uri });
    try {
      const res = await fetcher.executeSparqlQueryWithFallback(
        endpoint,
        query,
        proxyUrl,
        onProxyError,
        notify
      );
     
      allData[name] = res?.data;
    } catch (e) {
      throw new Error(`Error while retrieving "${name}" data.`)
    }
  }

  return { status: "success", data: allData };
}
