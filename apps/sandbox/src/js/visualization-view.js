export class VisualizationView {
  constructor({ graphEl, barChartEl, metaPanelEl }) {
    this.graphEl = graphEl;
    this.barChartEl = barChartEl;
    this.metaPanelEl = metaPanelEl;
  }

  async render({ scenario, endpoint, queryText, encoding, dataSource = "query", sparqlResult = null }) {
    const visType = scenario?.visType || "force-graph";

    this.graphEl.style.display = visType === "bar-chart" ? "none" : "block";
    this.barChartEl.style.display = visType === "bar-chart" ? "block" : "none";
    const activeVis = visType === "bar-chart" ? this.barChartEl : this.graphEl;

    if (visType === "bar-chart") {
      this.barChartEl.sparqlEndpoint = endpoint;
      this.barChartEl.sparqlQuery = dataSource === "query" ? queryText : null;
      this.barChartEl.sparqlResult = dataSource === "provided" ? sparqlResult : null;
      this.barChartEl.encoding = encoding;
      await this.barChartEl.launch();
      return { sparqlData: this.barChartEl.sparqlData || null };
    }

    this.graphEl.nodeDetailsPanel = this.metaPanelEl;
    this.graphEl.sparqlEndpoint = endpoint;
    this.graphEl.sparqlQuery = dataSource === "query" ? queryText : null;
    this.graphEl.sparqlResult = dataSource === "provided" ? sparqlResult : null;
    this.graphEl.encoding = encoding;
    await this.graphEl.launch();
    return { sparqlData: activeVis.sparqlData || null };
  }

  refreshCurrent({ scenario }) {
    const visType = scenario?.visType || "force-graph";
    if (visType === "bar-chart") {
      this.barChartEl?.render?.();
      return;
    }
    this.graphEl?.render?.();
  }
}
