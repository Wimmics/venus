import { SCENARIO_INDEX_PATH, STORAGE_KEY } from "./constants.js";
import { DemoControl } from "./demo-control.js";
import { EncodingEditor } from "./encoding-editor.js";
import { SnippetGenerator } from "./snippet-generator.js";
import { VisualizationView } from "./visualization-view.js";
import { CodeViewer } from "./code-viewer.js";
import { TabToolbar } from "./tab-toolbar.js";
import { SplitViewResizer } from "./split-view-resizer.js";

export class SandboxApp {
  constructor() {
    this.selectEl = document.getElementById("scenarioSelect");
    this.descriptionEl = document.getElementById("scenarioDescription");
    this.statusEl = document.getElementById("status");
    this.loadButton = document.getElementById("loadScenario");

    this.endpointInputEl = document.getElementById("endpointInput");
    this.resultsAsSourceToggleEl = document.getElementById("resultsAsSourceToggle");
    this.toggleDataCompressButton = document.getElementById("toggleDataCompress");
    this.toggleDataExpandButton = document.getElementById("toggleDataExpand");
    this.visualizationTabButton = document.getElementById("visualization-tab");

    this.demoControl = new DemoControl({
      selectEl: this.selectEl,
      descriptionEl: this.descriptionEl,
      storageKey: STORAGE_KEY,
      indexPath: SCENARIO_INDEX_PATH
    });

    this.encodingEditor = new EncodingEditor({ holderId: "encodingEditor" });
    this.sparqlEditor = new CodeViewer({ holderId: "sparqlEditor", language: "javascript", readOnly: false });
    this.resultsEditor = new CodeViewer({ holderId: "sparqlResults", language: "json", readOnly: false });
    this.generatedCode = new CodeViewer({ holderId: "generatedCode", language: "html", readOnly: true });

    this.snippetGenerator = new SnippetGenerator();
    this.visualizationView = new VisualizationView({
      graphEl: document.getElementById("graph"),
      barChartEl: document.getElementById("barChart"),
      metaPanelEl: document.getElementById("metaPanel")
    });

    this.splitViewResizer = new SplitViewResizer({
      containerEl: document.getElementById("workspaceRow"),
      panes: {
        config: document.getElementById("configPane"),
        data: document.getElementById("dataPane"),
        result: document.getElementById("resultPane")
      },
      splitters: {
        configData: document.getElementById("splitterConfigData"),
        dataResult: document.getElementById("splitterDataResult")
      }
    });

    this.autoRenderDelayMs = 350;
    this.autoRenderTimer = null;
    this.lastRenderedSparqlData = null;

    this.sparqlToolbar = new TabToolbar({
      holderId: "sparqlToolbar",
      actions: [
        {
          id: "sparql-copy",
          title: "Copy SPARQL query",
          iconClass: "bi bi-clipboard",
          onClick: async () => this.copySparqlToClipboard()
        },
        {
          id: "sparql-download",
          title: "Download SPARQL query",
          iconClass: "bi bi-download",
          onClick: async () => this.downloadSparqlQuery()
        }
      ]
    });

    this.encodingToolbar = new TabToolbar({
      holderId: "encodingToolbar",
      actions: [
        {
          id: "encoding-copy",
          title: "Copy encoding JSON",
          iconClass: "bi bi-clipboard",
          onClick: async () => this.copyEncodingToClipboard()
        },
        {
          id: "encoding-download",
          title: "Download encoding JSON",
          iconClass: "bi bi-download",
          onClick: async () => this.downloadEncodingJson()
        },
        {
          id: "encoding-reset",
          title: "Reload base encoding from demo",
          iconClass: "bi bi-arrow-counterclockwise",
          onClick: async () => this.restoreBaseEncoding()
        }
      ]
    });

    this.resultsToolbar = new TabToolbar({
      holderId: "resultsToolbar",
      actions: [
        {
          id: "results-copy",
          title: "Copy SPARQL results JSON",
          iconClass: "bi bi-clipboard",
          onClick: async () => this.copyResultsToClipboard()
        },
        {
          id: "results-download",
          title: "Download SPARQL results JSON",
          iconClass: "bi bi-download",
          onClick: async () => this.downloadResultsJson()
        }
      ]
    });

    this.snippetToolbar = new TabToolbar({
      holderId: "snippetToolbar",
      actions: [
        {
          id: "snippet-copy",
          title: "Copy integration code",
          iconClass: "bi bi-clipboard",
          onClick: async () => this.copySnippetToClipboard()
        },
        {
          id: "snippet-download",
          title: "Download integration code",
          iconClass: "bi bi-download",
          onClick: async () => this.downloadGeneratedSnippet()
        }
      ]
    });
  }

  async init() {
    this.splitViewResizer.init();
    this.bindEvents();
    this.sparqlToolbar.init();
    this.encodingToolbar.init();
    this.resultsToolbar.init();
    this.snippetToolbar.init();

    await this.sparqlEditor.init("");
    await this.encodingEditor.init();
    await this.resultsEditor.init("{}");
    await this.resultsEditor.setReadOnly(true);
    await this.generatedCode.init("// Generated integration snippet will appear here");

    await this.demoControl.init();
    if (!this.demoControl.hasScenarios()) {
      this.setStatus("No scenarios found in examples/encoding/scenarios.index.json", true);
      return;
    }

    await this.loadScenarioAndRefresh();
    this.updateDataCompressButton();
  }

  bindEvents() {
    this.loadButton.addEventListener("click", async () => {
      await this.loadScenarioAndRefresh();
    });

    this.selectEl.addEventListener("change", async () => {
      await this.loadScenarioAndRefresh();
    });

    this.endpointInputEl.addEventListener("input", () => {
      this.scheduleAutoRender();
      void this.updateGeneratedCode();
    });

    this.resultsAsSourceToggleEl.addEventListener("change", async () => {
      await this.applyResultsEditorMode();
      this.scheduleAutoRender();
      void this.updateGeneratedCode();
    });

    this.visualizationTabButton.addEventListener("shown.bs.tab", () => {
      this.refreshVisualizationTab();
    });

    this.toggleDataCompressButton.addEventListener("click", () => {
      this.toggleDataCompression();
    });
    this.toggleDataExpandButton.addEventListener("click", () => {
      this.toggleDataCompression();
    });

    this.encodingEditor.onChange = () => {
      this.scheduleAutoRender();
      void this.updateGeneratedCode();
    };

    this.sparqlEditor.onChange = () => {
      this.scheduleAutoRender();
      void this.updateGeneratedCode();
    };

    this.resultsEditor.onChange = () => {
      if (this.getDataSourceMode() !== "provided") return;
      this.scheduleAutoRender();
      void this.updateGeneratedCode();
    };
  }

  async loadScenarioAndRefresh() {
    await this.safeRun(
      async () => {
        this.setStatus(`Loading demo: ${this.selectEl.value}...`);

        const loadedScenario = await this.demoControl.loadSelectedScenario();
        const { queryText } = this.demoControl.getActiveContext();

        this.endpointInputEl.value = loadedScenario.endpoint || "";
        this.resultsAsSourceToggleEl.checked = loadedScenario?.dataSource === "provided";
        await this.applyResultsEditorMode();

        await this.sparqlEditor.setText(queryText || "");
        await this.encodingEditor.setValue(loadedScenario.encoding || {});
        await this.resultsEditor.setText(
          JSON.stringify(loadedScenario.sparqlResult || loadedScenario.results || {}, null, 2)
        );

        await this.updateGeneratedCode();
        await this.render();

        this.setStatus(`Loaded demo: ${loadedScenario.name || loadedScenario.id}`);
      },
      "Failed to load demo"
    );
  }

  async render() {
    await this.safeRun(
      async () => {
        const parsedEncoding = await this.encodingEditor.parseValue();
        if (parsedEncoding.error) {
          this.setStatus(`Invalid encoding JSON: ${parsedEncoding.error.message}`, true);
          return;
        }

        const { scenario } = this.demoControl.getActiveContext();
        if (!scenario) {
          this.setStatus("Select a scenario first.", true);
          return;
        }

        const endpoint = this._resolveEndpoint(scenario.endpoint);
        const dataSource = this.getDataSourceMode();
        const queryText = await this.sparqlEditor.getText();

        let providedSparqlResult = null;
        if (dataSource === "provided") {
          const parsedResults = await this.parseResultsJson();
          if (parsedResults.error) {
            this.setStatus(`Invalid SPARQL Results JSON: ${parsedResults.error.message}`, true);
            return;
          }
          providedSparqlResult = parsedResults.value;
        }

        this.setStatus("Rendering...");
        const output = await this.visualizationView.render({
          scenario,
          endpoint,
          queryText,
          encoding: parsedEncoding.value,
          dataSource,
          sparqlResult: providedSparqlResult
        });

        this.lastRenderedSparqlData = output?.sparqlData || null;

        if (dataSource === "query") {
          await this.resultsEditor.setText(JSON.stringify(this.lastRenderedSparqlData || {}, null, 2));
        }

        await this.updateGeneratedCode();
        this.setStatus(`Rendered: ${scenario.name || scenario.id}`);
      },
      "Render failed"
    );
  }

  async updateGeneratedCode() {
    const parsedEncoding = await this.encodingEditor.parseValue();
    const { scenario } = this.demoControl.getActiveContext();
    if (!scenario || parsedEncoding.error) {
      await this.generatedCode.setText("// Invalid or missing configuration");
      return;
    }

    const dataSource = this.getDataSourceMode();
    const endpoint = this._resolveEndpoint(scenario.endpoint);
    const queryText = await this.sparqlEditor.getText();
    const parsedResults = dataSource === "provided" ? await this.parseResultsJson() : { value: null, error: null };
    if (parsedResults.error) {
      await this.generatedCode.setText("// Invalid SPARQL Results JSON for provided data mode");
      return;
    }

    await this.generatedCode.setText(
      this.snippetGenerator.generate({
        visType: scenario.visType || "force-graph",
        endpoint,
        queryText,
        encoding: parsedEncoding.value,
        dataSource,
        sparqlResult: parsedResults.value
      })
    );
  }

  _resolveEndpoint(fallback = "") {
    const typed = String(this.endpointInputEl.value || "").trim();
    return typed || fallback || "https://dbpedia.org/sparql";
  }

  getDataSourceMode() {
    return this.resultsAsSourceToggleEl.checked ? "provided" : "query";
  }

  async applyResultsEditorMode() {
    const useResultsAsSource = this.getDataSourceMode() === "provided";
    await this.resultsEditor.setReadOnly(!useResultsAsSource);
  }

  async parseResultsJson() {
    const raw = await this.resultsEditor.getText();
    try {
      return { value: JSON.parse(raw), error: null };
    } catch (error) {
      return { value: null, error };
    }
  }

  toggleDataCompression() {
    const changed = this.splitViewResizer.toggleCompressPane("data");
    if (!changed) return;
    this.updateDataCompressButton();
  }

  updateDataCompressButton() {
    const compressed = this.splitViewResizer.isPaneCompressed("data");
    this.toggleDataCompressButton.classList.toggle("active", compressed);
    this.toggleDataCompressButton.title = compressed
      ? "Expand Results panel"
      : "Compress Results panel";
    this.toggleDataCompressButton.setAttribute(
      "aria-label",
      compressed ? "Expand Results panel" : "Compress Results panel"
    );
    this.toggleDataCompressButton.innerHTML = compressed
      ? '<i class="bi bi-arrows-expand-vertical" aria-hidden="true"></i>'
      : '<i class="bi bi-arrows-collapse-vertical" aria-hidden="true"></i>';
    this.toggleDataExpandButton.innerHTML = '<i class="bi bi-arrows-expand-vertical" aria-hidden="true"></i>';
  }

  scheduleAutoRender() {
    if (this.autoRenderTimer) {
      clearTimeout(this.autoRenderTimer);
    }
    this.autoRenderTimer = setTimeout(() => {
      this.autoRenderTimer = null;
      void this.render();
    }, this.autoRenderDelayMs);
  }

  refreshVisualizationTab() {
    const { scenario } = this.demoControl.getActiveContext();
    if (!scenario) return;
    requestAnimationFrame(() => {
      this.visualizationView.refreshCurrent({ scenario });
    });
  }

  setStatus(message, isError = false) {
    this.statusEl.textContent = message || "";
    this.statusEl.classList.toggle("error", Boolean(isError));
  }

  async safeRun(action, fallbackMessage) {
    try {
      return await action();
    } catch (error) {
      console.error(error);
      this.setStatus(error.message || fallbackMessage, true);
      return null;
    }
  }

  async copySparqlToClipboard() {
    await this.safeRun(
      async () => {
        const text = await this.sparqlEditor.getText();
        await navigator.clipboard.writeText(text || "");
        this.setStatus("SPARQL query copied to clipboard");
      },
      "Failed to copy SPARQL query"
    );
  }

  async copyEncodingToClipboard() {
    await this.safeRun(
      async () => {
        const text = await this.encodingEditor.getText();
        await navigator.clipboard.writeText(text || "");
        this.setStatus("Encoding JSON copied to clipboard");
      },
      "Failed to copy encoding JSON"
    );
  }

  async copyResultsToClipboard() {
    await this.safeRun(
      async () => {
        const text = await this.resultsEditor.getText();
        await navigator.clipboard.writeText(text || "");
        this.setStatus("SPARQL results copied to clipboard");
      },
      "Failed to copy SPARQL results JSON"
    );
  }

  async copySnippetToClipboard() {
    await this.safeRun(
      async () => {
        const text = await this.generatedCode.getText();
        await navigator.clipboard.writeText(text || "");
        this.setStatus("Integration code copied to clipboard");
      },
      "Failed to copy integration code"
    );
  }

  async downloadSparqlQuery() {
    await this.safeRun(
      async () => {
        const { scenario } = this.demoControl.getActiveContext();
        const text = await this.sparqlEditor.getText();
        const filename = `${this.buildSafeFileStem(scenario?.id || "query")}.rq`;
        this.downloadTextFile(text, filename, "application/sparql-query");
        this.setStatus(`Downloaded ${filename}`);
      },
      "Failed to download SPARQL query"
    );
  }

  async downloadEncodingJson() {
    await this.safeRun(
      async () => {
        const { scenario } = this.demoControl.getActiveContext();
        const text = await this.encodingEditor.getText();
        const filename = `${this.buildSafeFileStem(scenario?.id || "encoding")}.json`;
        this.downloadTextFile(text, filename, "application/json");
        this.setStatus(`Downloaded ${filename}`);
      },
      "Failed to download encoding JSON"
    );
  }

  async downloadResultsJson() {
    await this.safeRun(
      async () => {
        const { scenario } = this.demoControl.getActiveContext();
        const text = await this.resultsEditor.getText();
        const filename = `${this.buildSafeFileStem(scenario?.id || "results")}.json`;
        this.downloadTextFile(text, filename, "application/json");
        this.setStatus(`Downloaded ${filename}`);
      },
      "Failed to download SPARQL results JSON"
    );
  }

  async downloadGeneratedSnippet() {
    await this.safeRun(
      async () => {
        const { scenario } = this.demoControl.getActiveContext();
        const text = await this.generatedCode.getText();
        const filename = `${this.buildSafeFileStem(scenario?.id || "integration")}.html`;
        this.downloadTextFile(text, filename, "text/html");
        this.setStatus(`Downloaded ${filename}`);
      },
      "Failed to download integration code"
    );
  }

  async restoreBaseEncoding() {
    await this.safeRun(
      async () => {
        const { scenario } = this.demoControl.getActiveContext();
        if (!scenario) {
          this.setStatus("No demo selected.", true);
          return;
        }

        await this.encodingEditor.setValue(scenario.encoding || {});
        await this.updateGeneratedCode();
        await this.render();
        this.setStatus(`Base encoding reloaded: ${scenario.name || scenario.id}`);
      },
      "Failed to restore base encoding"
    );
  }

  buildSafeFileStem(value) {
    return (
      String(value || "kgnovis")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "kgnovis"
    );
  }

  downloadTextFile(content, filename, mimeType) {
    const blob = new Blob([String(content || "")], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
