/**
* SPARQL data fetcher with a simple fallback strategy:
* 1) Try the SPARQL endpoint directly (GET)
* 2) If it fails AND a proxy is provided, try via proxy (GET)
*
* Design goals:
* - Keep the code minimal and readable
* - Use GET by default (public endpoints often accept it and it avoids POST preflight)
* - Provide clean, single-line logs (no multi-console-error spam)
* - Return a consistent result object for consumers (status/method/message/data/rawData)
*/

export class SparqlDataFetcher {
	constructor({ debug = false, timeoutMs = 30000 } = {}) {
		this.debug = Boolean(debug);
		this.timeoutMs = Number(timeoutMs) || 30000;
	}
	
	// ---------- Logging (clean + consistent) ----------
	_log(level, message, meta) {
		// levels: "debug" | "info" | "warn" | "error"
		if (level === "debug" && !this.debug) return;
		
		const prefix = "[SparqlDataFetcher]";
		const payload = meta ? ` ${JSON.stringify(meta)}` : "";
		const line = `${prefix} ${level.toUpperCase()}: ${message}${payload}`;
		
		// Use a single console call per log line
		if (level === "error") console.error(line);
		else if (level === "warn") console.warn(line);
		else if (level === "info") console.info(line);
		else console.log(line);
	}
	
	// ---------- Helpers ----------
	_isCorsLikeError(err) {
		// Browser fetch CORS failures are often opaque: TypeError: Failed to fetch
		const msg = (err?.message || String(err)).toLowerCase();
		return (
			msg.includes("failed to fetch") ||
			msg.includes("networkerror") ||
			msg.includes("cors") ||
			msg.includes("cross-origin") ||
			msg.includes("blocked by") ||
			msg.includes("access-control-allow-origin")
		);
	}
	
	_buildDirectGetUrl(endpoint, query) {
		const url = new URL(endpoint);
		url.searchParams.set("query", query);
		url.searchParams.set("format", "json");
		
		// Wikidata browser-friendly hint
		if (url.hostname === "query.wikidata.org") {
			url.searchParams.set("origin", "*");
		}
		return url.toString();
	}
	
	_buildProxyGetUrl(proxyUrl, endpoint, query) {
		const url = new URL(proxyUrl);
		url.searchParams.set("endpoint", endpoint);
		url.searchParams.set("query", query);
		return url.toString();
	}
	
	async _fetchJson(url, { timeoutMs } = {}) {
		const controller = new AbortController();
		const t = setTimeout(() => controller.abort(), timeoutMs);
		
		try {
			const r = await fetch(url, {
				method: "GET",
				headers: {
					Accept: "application/sparql-results+json, application/json"
				},
				signal: controller.signal
			});
			
			if (!r.ok) {
				const text = await r.text().catch(() => "");
				throw new Error(`HTTP ${r.status} ${r.statusText}: ${text.slice(0, 300)}`);
			}
			
			return await r.json();
		} catch (e) {
			if (e?.name === "AbortError") {
				throw new Error(`Request timed out after ${timeoutMs}ms`);
			}
			throw e;
		} finally {
			clearTimeout(t);
		}
	}
	
	// ---------- Core API ----------
	/**
	* Execute a SPARQL query with a simple strategy:
	* - If a proxy URL is provided: use the proxy (GET) as the primary path.
	*   If the proxy fails, fallback to direct endpoint (GET).
	* - If no proxy URL is provided: use the direct endpoint (GET).
	*
	* @returns {Promise<{data: any, method: "proxy-get"|"direct-get"}>}
	*/
	async executeSparqlQueryWithFallback(endpoint, query, proxyUrl = null, opts = {}) {
		const timeoutMs = Number(opts.timeoutMs ?? this.timeoutMs);
		const q = String(query || "").trim();
		const ep = String(endpoint || "").trim();
		const px = proxyUrl ? String(proxyUrl).trim() : "";
		
		if (!ep || !q) {
			throw new Error('Missing required parameters: "endpoint" and "query".');
		}
		
		// If proxy is provided, try proxy first
		if (px) {
			const proxyFullUrl = this._buildProxyGetUrl(px, ep, q);
			this._log("debug", "Proxy GET request", { url: proxyFullUrl, timeoutMs });
			
			try {
				const data = await this._fetchJson(proxyFullUrl, { timeoutMs });
				return { data, method: "proxy-get" };
			} catch (proxyErr) {
				const proxyMsg = proxyErr?.message || String(proxyErr);
				this._log("warn", "Proxy request failed, falling back to direct", { message: proxyMsg });
				
				// Fallback to direct
				const directUrl = this._buildDirectGetUrl(ep, q);
				this._log("debug", "Direct GET fallback request", { url: directUrl, timeoutMs });
				
				try {
					const data = await this._fetchJson(directUrl, { timeoutMs });
					return { data, method: "direct-get" };
				} catch (directErr) {
					const directMsg = directErr?.message || String(directErr);
					
					// Single clean error containing both causes
					const hint = this._isCorsLikeError(directErr)
					? " (hint: this looks like a CORS/network error; proxy is usually required in browsers)"
					: "";
					
					throw new Error(
						`SPARQL request failed. Proxy error: ${proxyMsg}. Direct error: ${directMsg}${hint}`
					);
				}
			}
		}
		
		// No proxy: direct only
		const directUrl = this._buildDirectGetUrl(ep, q);
		this._log("debug", "Direct GET request", { url: directUrl, timeoutMs });
		
		try {
			const data = await this._fetchJson(directUrl, { timeoutMs });
			return { data, method: "direct-get" };
		} catch (directErr) {
			const directMsg = directErr?.message || String(directErr);
			throw new Error(`Direct SPARQL request failed: ${directMsg}`);
		}
	}
	
	
	/**
	* High-level helper used by components:
	* - If jsonData is provided, returns it immediately.
	* - Otherwise executes query with fallback and returns a normalized result object.
	*/
	async fetchSparqlData(endpoint, query, jsonData = null, proxyUrl = null, onProxyError = null, onNotification = null, opts = {}) {
		try {
			// 1) Direct JSON
			if (jsonData) {
				this._log("debug", "Using provided JSON data");
				return {
					status: "success",
					method: "direct-json",
					message: "Data loaded from provided JSON.",
					data: jsonData,
					rawData: jsonData
				};
			}
			
			// 2) Endpoint then proxy fallback
			const { data: rawData, method } = await this.executeSparqlQueryWithFallback(endpoint, query, proxyUrl, opts);
			
			return {
				status: "success",
				method,
				message: `Data loaded via ${method}.`,
				data: rawData,
				rawData
			};
		} catch (err) {
			const msg = err?.message || String(err);
			
			// Optional UI hooks: call them once with a clean message
			if (proxyUrl && onProxyError && msg.toLowerCase().includes("proxy error")) {
				try { onProxyError(); } catch (_) {}
			}
			if (onNotification) {
				try { onNotification(msg, "error"); } catch (_) {}
			}
			
			this._log("error", "Failed to load SPARQL data", { message: msg });
			
			return {
				status: "error",
				method: "none",
				message: msg,
				data: null,
				rawData: null
			};
		}
	}
}
