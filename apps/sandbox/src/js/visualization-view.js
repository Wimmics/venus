export class VisualizationView {
  constructor({ graphEl, barChartEl, metaPanelEl }) {
    this.graphEl = graphEl;
    this.barChartEl = barChartEl;
    this.metaPanelEl = metaPanelEl;
  }

  async render({ scenario, queryText, encoding }) {
    const visType = scenario?.visType || "force-graph";
    const endpoint = scenario?.endpoint;

    this.graphEl.style.display = visType === "bar-chart" ? "none" : "block";
    this.barChartEl.style.display = visType === "bar-chart" ? "block" : "none";

    if (visType === "bar-chart") {
      this.barChartEl.sparqlEndpoint = endpoint;
      this.barChartEl.sparqlQuery = queryText;
      this.barChartEl.encoding = encoding;
      await this.barChartEl.launch();
      return;
    }

    this.graphEl.nodeDetailsPanel = this.metaPanelEl;
    this.graphEl.sparqlEndpoint = endpoint;
    this.graphEl.sparqlQuery = queryText;
    this.graphEl.encoding = encoding;
    await this.graphEl.launch();
  }
}
