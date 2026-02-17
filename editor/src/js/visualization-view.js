export class VisualizationView {
  constructor({ hostEl, metaPanelEl }) {
    this.hostEl = hostEl;
    this.metaPanelEl = metaPanelEl;
    this.activeComponentTag = null;
    this.activeComponentEl = null;
  }

  async render({ scenario, endpoint, queryText, encoding, dataSource = "query", sparqlResult = null }) {
    const tag = scenario?.component || "vis-graph";
    const component = await this._ensureComponent(tag);

    if (typeof component.launch !== "function") {
      const ctorName = component?.constructor?.name || "UnknownElement";
      throw new Error(
        `Component "${tag}" is not launchable (instance: ${ctorName}). Expected a VisBase descendant.`
      );
    }

    if (tag === "vis-graph" && this.metaPanelEl) {
      component.nodeDetailsPanel = this.metaPanelEl;
    }

    component.sparqlEndpoint = endpoint;
    component.sparqlQuery = dataSource === "query" ? queryText : null;
    component.sparqlResult = dataSource === "provided" ? sparqlResult : null;
    component.encoding = encoding;
    await component.launch();

    return { sparqlData: component.sparqlData || null };
  }

  refreshCurrent({ scenario }) {
    const tag = scenario?.component || "vis-graph";
    Promise.resolve(this._ensureComponent(tag)).then((component) => {
      component?.render?.();
    });
  }

  async _ensureComponent(tag) {
    await customElements.whenDefined(tag);
    const RegisteredCtor = customElements.get(tag);

    if (this.activeComponentEl && this.activeComponentTag === tag) {
      if (!RegisteredCtor || this.activeComponentEl instanceof RegisteredCtor) {
        return this.activeComponentEl;
      }
    }

    this.hostEl.innerHTML = "";
    const next = RegisteredCtor ? new RegisteredCtor() : document.createElement(tag);
    next.setAttribute("width", "100%");
    next.setAttribute("height", "100%");
    this.hostEl.appendChild(next);

    this.activeComponentEl = next;
    this.activeComponentTag = tag;
    return next;
  }
}
