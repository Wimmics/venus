import { SCENARIO_INDEX_PATH, STORAGE_KEY } from "./constants.js";
import { DemoControl } from "./demo-control.js";
import { SnippetGenerator } from "./snippet-generator.js";
import { VisualizationView } from "./visualization-view.js";
import { SplitViewResizer } from "./split-view-resizer.js";
import { SparqlPanelController } from "./sparql-panel-controller.js";
import { EncodingPanelController } from "./encoding-panel-controller.js";
import { ResultsPanelController } from "./results-panel-controller.js";
import { SnippetPanelController } from "./snippet-panel-controller.js";
import { safeRun, updateStatus } from "./utils/safe-run.js";

export class SandboxApp {
  constructor() {
    this.selectEl = document.getElementById("scenarioSelect");
    this.descriptionEl = document.getElementById("scenarioDescription");

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

    this.snippetGenerator = new SnippetGenerator();
    this.visualizationView = new VisualizationView({
      hostEl: document.getElementById("visualizationHost"),
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

    this.sparqlPanelController = new SparqlPanelController({
      demoControl: this.demoControl,
      onContentChanged: () => {
        this.scheduleAutoRender();
        void this.updateGeneratedCode();
      },
      onAfterReset: async () => {
        await this.updateGeneratedCode();
        await this.render();
      }
    });

    this.encodingPanelController = new EncodingPanelController({
      demoControl: this.demoControl,
      onContentChanged: () => {
        this.scheduleAutoRender();
        void this.updateGeneratedCode();
      },
      onAfterReset: async () => {
        await this.updateGeneratedCode();
        await this.render();
      }
    });

    this.resultsPanelController = new ResultsPanelController({
      demoControl: this.demoControl,
      onContentChanged: () => {
        if (this.getDataSourceMode() !== "provided") return;
        this.scheduleAutoRender();
        void this.updateGeneratedCode();
      }
    });

    this.snippetPanelController = new SnippetPanelController({
      demoControl: this.demoControl
    });
  }

  async init() {
    this.splitViewResizer.init();
    this.bindEvents();
    await this.sparqlPanelController.init("");
    await this.encodingPanelController.init();
    await this.resultsPanelController.init("{}");
    await this.resultsPanelController.setReadOnly(true);
    await this.snippetPanelController.init("// Generated integration snippet will appear here");

    await this.demoControl.init();
    if (!this.demoControl.hasScenarios()) {
      this.setStatus("No scenarios found in examples/encoding/scenarios.index.json", true);
      return;
    }

    await this.loadScenarioAndRefresh();
    this.updateDataCompressButton();
  }

  bindEvents() {
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

        await this.sparqlPanelController.setText(queryText || "");
        await this.encodingPanelController.setValue(loadedScenario.encoding || {});
        await this.resultsPanelController.setText(
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
        const parsedEncoding = await this.encodingPanelController.parseValue();
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
        const queryText = await this.sparqlPanelController.getText();

        let providedSparqlResult = null;
        if (dataSource === "provided") {
          const parsedResults = await this.resultsPanelController.parseJson();
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
          await this.resultsPanelController.setText(JSON.stringify(this.lastRenderedSparqlData || {}, null, 2));
        }

        await this.updateGeneratedCode();
        this.setStatus(`Rendered: ${scenario.name || scenario.id}`);
      },
      "Render failed"
    );
  }

  async updateGeneratedCode() {
    const parsedEncoding = await this.encodingPanelController.parseValue();
    const { scenario } = this.demoControl.getActiveContext();
    if (!scenario || parsedEncoding.error) {
      await this.snippetPanelController.setText("// Invalid or missing configuration");
      return;
    }

    const dataSource = this.getDataSourceMode();
    const endpoint = this._resolveEndpoint(scenario.endpoint);
    const queryText = await this.sparqlPanelController.getText();
    const parsedResults = dataSource === "provided"
      ? await this.resultsPanelController.parseJson()
      : { value: null, error: null };
    if (parsedResults.error) {
      await this.snippetPanelController.setText("// Invalid SPARQL Results JSON for provided data mode");
      return;
    }

    await this.snippetPanelController.setText(
      this.snippetGenerator.generate({
        component: scenario.component || "vis-graph",
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
    await this.resultsPanelController.setReadOnly(!useResultsAsSource);
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
    updateStatus(message, { isError });
  }

  async safeRun(action, fallbackMessage) {
    return safeRun(action, { fallbackMessage });
  }
}
