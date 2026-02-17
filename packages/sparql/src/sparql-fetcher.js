/**
 * SPARQL data fetcher with a simple fallback strategy:
 * - If a proxy URL is provided: use the proxy (GET) first, then fallback to direct (GET)
 * - If no proxy URL is provided: use direct (GET)
 *
 * Notes:
 * - Uses GET by default (public endpoints often accept it; avoids POST preflight)
 * - Clean, single-line logs via shared logger factory (createLogger)
 * - Returns consistent result objects for consumers
 */

import { createLogger } from "@wimmics/venus-core"; // adjust if your core package name differs

export class SparqlDataFetcher {
  constructor({ debug = false, timeoutMs = 30000, logLevel = "info" } = {}) {
    this.timeoutMs = Number(timeoutMs) || 30000;
    this.log = createLogger("SparqlDataFetcher", { debug: Boolean(debug), level: logLevel });
  }

  // ---------- Helpers ----------
  _isCorsLikeError(err) {
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
      if (e?.name === "AbortError") throw new Error(`Request timed out after ${timeoutMs}ms`);
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

  // ---------- Core API ----------
  /**
   * Execute a SPARQL query with a simple strategy:
   * - If a proxy URL is provided: use proxy GET first; if it fails, fallback to direct GET.
   * - If no proxy URL is provided: direct GET only.
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

    // Proxy first (if provided)
    if (px) {
      const proxyFullUrl = this._buildProxyGetUrl(px, ep, q);
      this.log.debug("Proxy GET request", { url: proxyFullUrl, timeoutMs });

      try {
        const data = await this._fetchJson(proxyFullUrl, { timeoutMs });
        return { data, method: "proxy-get" };
      } catch (proxyErr) {
        const proxyMsg = proxyErr?.message || String(proxyErr);
        this.log.warn("Proxy request failed, falling back to direct", { message: proxyMsg });

        const directUrl = this._buildDirectGetUrl(ep, q);
        this.log.debug("Direct GET fallback request", { url: directUrl, timeoutMs });

        try {
          const data = await this._fetchJson(directUrl, { timeoutMs });
          return { data, method: "direct-get" };
        } catch (directErr) {
          const directMsg = directErr?.message || String(directErr);
          const hint = this._isCorsLikeError(directErr)
            ? " (hint: this looks like a CORS/network error; proxy is usually required in browsers)"
            : "";

          throw new Error(`SPARQL request failed. Proxy error: ${proxyMsg}. Direct error: ${directMsg}${hint}`);
        }
      }
    }

    // Direct only
    const directUrl = this._buildDirectGetUrl(ep, q);
    this.log.debug("Direct GET request", { url: directUrl, timeoutMs });

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
   * - Executes query with fallback and returns a normalized result object.
   */
  async fetchSparqlData(endpoint, query, proxyUrl = null, onProxyError = null, onNotification = null, opts = {}) {
    try {

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

      // Optional hooks: call them once
      if (proxyUrl && onProxyError && msg.toLowerCase().includes("proxy error")) {
        try { onProxyError(); } catch (_) {}
      }
      if (onNotification) {
        try { onNotification(msg, "error"); } catch (_) {}
      }

      this.log.error("Failed to load SPARQL data", { message: msg });

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
