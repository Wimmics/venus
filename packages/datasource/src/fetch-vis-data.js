// build-vis.js
import { SparqlDataFetcher } from "./sparql-fetcher";

/**
* Template method:
* - fetch raw SPARQL JSON (shared)
* - delegate mapping to the provided mapToVis (per visualization)
*/
export async function fetchVisData({
	// source
	endpoint = null,
	query = null,
	jsonData = null,
	proxyUrl = null,
	fetcher = null,
	
	// retry
	retries = 0,
	retryDelayMs = 250,
} = {}) {
	
	const effectiveFetcher = fetcher || new SparqlDataFetcher();
	
	const attemptMax = Math.max(0, retries) + 1;
	let lastErr = null;

	for (let attempt = 1; attempt <= attemptMax; attempt++) {
	try {

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
		throw new Error(e)
	
		if (attempt < attemptMax) {
		await sleep(retryDelayMs);
		continue;
		}
	}
	}

	return {
	status: "error",
	message: lastErr?.message || "Failed to fetch raw data",
	error: lastErr
	};
	
}
