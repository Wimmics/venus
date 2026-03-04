import { fetchNodeDetails } from "@wimmics/venus-sparql";
import { createLogger } from "@wimmics/venus-core";

export class VisURIMeta extends HTMLElement {
  static get observedAttributes() {
    return ["open"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this._logger = createLogger("VisURIMeta", { debug: true });
    this._node = null;
    this._endpoint = "https://dbpedia.org/sparql";
    this._proxy = null;

    this._data = null;
    this._status = "idle"; // idle|loading|success|error
    this._error = null;
  }

  set logger(l) {
    this._logger = l || createLogger("VisURIMeta", { debug: false });
  }
  get logger() {
    return this._logger;
  }

  set node(n) {
    this._node = n;
    this._data = null;
    this._error = null;
    this._status = "idle";
    this.render();
    // Auto-fetch if panel is open and node has a URI
    if (this.open && this._node?.uri) this.load();
  }
  get node() {
    return this._node;
  }

  set sparqlEndpoint(url) {
    if (url) this._endpoint = url;
  }
  get sparqlEndpoint() {
    return this._endpoint;
  }

  set proxy(url) {
    this._proxy = url || null;
  }
  get proxy() {
    return this._proxy;
  }

  get open() {
    return this.hasAttribute("open");
  }
  set open(v) {
    if (v) this.setAttribute("open", "");
    else this.removeAttribute("open");
  }

  attributeChangedCallback(name, _old, _new) {
    if (name === "open") this.render();
  }

  connectedCallback() {
    this.render();
  }

  async load() {
    if (!this._node?.uri) {
      this._status = "error";
      this._error = new Error("No URI available for this node");
      this._logger.warn("load() called without node.uri", { node: this._node });
      this.render();
      this.dispatchEvent(new CustomEvent("error", { detail: { error: this._error } }));
      return;
    }

    this._status = "loading";
    this._error = null;
    this.render();

    try {
      this._logger.debug("Fetching node details", {
        uri: this._node.uri,
        endpoint: this._endpoint,
        proxy: this._proxy
      });

      const res = await fetchNodeDetails(this._node.uri, {
        endpoint: this._endpoint,
        proxyUrl: this._proxy
      });

      if (res.status !== "success") {
        throw new Error(res.message || "Failed to fetch node details");
      }

      this._data = res.data;
      this._status = "success";
      this.render();

      this.dispatchEvent(new CustomEvent("loaded", { detail: { node: this._node, data: this._data } }));
    } catch (e) {
      this._status = "error";
      this._error = e;
      this._logger.warn("Node details fetch failed", { message: e?.message });
      this.render();
      this.dispatchEvent(new CustomEvent("error", { detail: { error: e } }));
    }
  }

  close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent("close"));
  }

  render() {
    const visible = this.open;
    const node = this._node;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: ${visible ? "block" : "none"}; }
        .panel {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 350px;
          max-height: calc(100% - 20px);
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          overflow: auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 50;
          font-family: Arial, sans-serif;
        }
        .header {
          padding: 10px;
          background: #f3f3f3;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .title { margin: 0; font-size: 14px; font-weight: bold; }
        .close {
          border: none;
          background: transparent;
          font-size: 18px;
          cursor: pointer;
          color: #666;
        }
        .content { padding: 10px; font-size: 12px; }
        .row { margin: 8px 0; word-break: break-all; }
        .label { font-weight: bold; color: #2c3e50; display: block; margin-bottom: 2px; }
        .muted { color: #666; }
        .status { padding: 8px; border-radius: 4px; background: #f8f9fa; border: 1px solid #eee; }
        a { color: #007cba; }
      </style>

      <div class="panel">
        <div class="header">
          <div class="title">${node?.label || node?.id || "Node details"}</div>
          <button class="close" aria-label="Close">×</button>
        </div>
        <div class="content">
          ${this._renderBody()}
        </div>
      </div>
    `;

    this.shadowRoot.querySelector(".close")?.addEventListener("click", () => this.close());

    // Provide a manual fetch button if not loaded yet
    this.shadowRoot.querySelector("[data-action='load']")?.addEventListener("click", () => this.load());
  }

  _renderBody() {
    const node = this._node;

    if (!node) {
      return `<div class="status muted">No node selected.</div>`;
    }

    if (!node.uri) {
      return `
        <div class="status">This node has no URI.</div>
        <div class="row"><span class="label">Label</span>${node.label || node.id}</div>
      `;
    }

    if (this._status === "idle") {
      return `
        <div class="row"><span class="label">URI</span><a href="${node.uri}" target="_blank" rel="noreferrer">${node.uri}</a></div>
        <button data-action="load">Load metadata</button>
      `;
    }

    if (this._status === "loading") {
      return `<div class="status">Loading…</div>`;
    }

    if (this._status === "error") {
      return `
        <div class="status">Error: ${this._error?.message || "Unknown error"}</div>
        <button data-action="load">Retry</button>
      `;
    }

    // success
    const descriptiveCount = this._data?.descriptive?.results?.bindings?.length || 0;
    const relationshipsCount = this._data?.relationships?.results?.bindings?.length || 0;
    const technicalCount = this._data?.technical?.results?.bindings?.length || 0;

    return `
      <div class="row"><span class="label">URI</span><a href="${node.uri}" target="_blank" rel="noreferrer">${node.uri}</a></div>
      <div class="row"><span class="label">Summary</span>
        <div class="muted">
          ${descriptiveCount} descriptive • ${relationshipsCount} relationships • ${technicalCount} technical
        </div>
      </div>

      <!-- For now: keep rendering simple; you can move your existing section builders here next -->
      <details open>
        <summary>Descriptive</summary>
        ${this._renderBindings(this._data?.descriptive?.results?.bindings)}
      </details>
      <details>
        <summary>Relationships</summary>
        ${this._renderBindings(this._data?.relationships?.results?.bindings)}
      </details>
      <details>
        <summary>Technical</summary>
        ${this._renderBindings(this._data?.technical?.results?.bindings)}
      </details>
    `;
  }

  _renderBindings(bindings) {
    if (!bindings || bindings.length === 0) return `<div class="muted">No data.</div>`;

    return `
      <div>
        ${bindings
          .slice(0, 50)
          .map(
            (b) => `
            <div class="row">
              <span class="label">${b.property?.value?.split(/[/#]/).pop() || "property"}</span>
              <div>${b.value?.value || ""}</div>
            </div>
          `
          )
          .join("")}
      </div>
    `;
  }
}

if (!customElements.get("venus-uri-meta")) {
  customElements.define("venus-uri-meta", VisURIMeta);
}
