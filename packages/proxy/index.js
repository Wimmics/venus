#!/usr/bin/env node

/**
 * Minimal SPARQL proxy to avoid browser CORS issues.
 *
 * Usage:
 *   1) Install:
 *      npm i express cors
 *      (Node 18+ recommended; uses built-in fetch)
 *
 *   2) Run:
 *      node proxy.js
 *      # or: PROXY_PORT=3001 node proxy.js
 *
 * Endpoint:
 *   GET/POST /sparql-proxy
 *
 * Parameters (either querystring or JSON body):
 *   - endpoint: SPARQL endpoint URL (required)
 *   - query: SPARQL query string (required)
 *
 * Example:
 *   http://localhost:3001/sparql-proxy?endpoint=https%3A%2F%2Fquery.wikidata.org%2Fsparql&query=SELECT%20*%20WHERE%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20LIMIT%201
 *
 * Notes:
 * - This is a minimal example. In production you should restrict allowed endpoints,
 *   add authentication/rate limiting, and handle caching.
 */

import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PROXY_PORT || 3001);

// Allow cross-origin requests to this proxy (so your browser app can call it).
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/proxy-status", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

function pickParam(req, name) {
  // Accept either querystring or JSON body
  return req.query?.[name] ?? req.body?.[name];
}

async function forwardSparql({ endpoint, query }) {
  // Prefer POST (more reliable for long queries); fallback to GET if the endpoint refuses POST.
  const accept = "application/sparql-results+json, application/json;q=0.9";

  // POST
  try {
    const postBody = new URLSearchParams({ query });

    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "accept": accept,
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "user-agent": "sparql-proxy/1.0"
      },
      body: postBody
    });

    if (!r.ok) {
      const text = await r.text();
      throw new Error(`POST ${r.status} ${r.statusText}: ${text.slice(0, 300)}`);
    }

    return await r.json();
  } catch (postErr) {
    // GET fallback
    const url = new URL(endpoint);
    url.searchParams.set("query", query);

    const r = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "accept": accept,
        "user-agent": "sparql-proxy/1.0"
      }
    });

    if (!r.ok) {
      const text = await r.text();
      const postMsg = postErr?.message || String(postErr);
      throw new Error(
        `Proxy failed. POST error: ${postMsg}. GET error: GET ${r.status} ${r.statusText}: ${text.slice(0, 300)}`
      );
    }

    return await r.json();
  }
}

app.all("/sparql-proxy", async (req, res) => {
  const endpoint = pickParam(req, "endpoint");
  const query = pickParam(req, "query");

  if (!endpoint || !query) {
    return res.status(400).json({
      error: 'Missing required parameters: "endpoint" and "query".'
    });
  }

  // Basic hardening: only allow http(s)
  if (!/^https?:\/\//i.test(endpoint)) {
    return res.status(400).json({
      error: '"endpoint" must be an http(s) URL.'
    });
  }

  try {
    const data = await forwardSparql({ endpoint, query });
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({
      error: "Proxy request failed.",
      message: err?.message || String(err)
    });
  }
});

app.listen(PORT, () => {
  console.log(`[sparql-proxy] Listening on http://localhost:${PORT}`);
  console.log(`[sparql-proxy] Health check: http://localhost:${PORT}/proxy-status`);
  console.log(`[sparql-proxy] Query endpoint: http://localhost:${PORT}/sparql-proxy?endpoint=...&query=...`);
});

// Fail loudly (useful for debugging)
process.on("unhandledRejection", (reason) => {
  console.error("[sparql-proxy] Unhandled Rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[sparql-proxy] Uncaught Exception:", error);
});
