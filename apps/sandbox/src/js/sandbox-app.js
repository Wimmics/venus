import { SCENARIO_INDEX_PATH, STORAGE_KEY } from "./constants.js";
import { DemoControl } from "./demo-control.js";
import { EncodingEditor } from "./encoding-editor.js";
import { SnippetGenerator } from "./snippet-generator.js";
import { VisualizationView } from "./visualization-view.js";
import { CodeViewer } from "./code-viewer.js";
import { SplitViewResizer } from "./split-view-resizer.js";

export class SandboxApp {
  constructor() {
    this.selectEl = document.getElementById("scenarioSelect");
    this.descriptionEl = document.getElementById("scenarioDescription");
    this.statusEl = document.getElementById("status");

    this.loadButton = document.getElementById("loadScenario");

    this.demoControl = new DemoControl({
      selectEl: this.selectEl,
      descriptionEl: this.descriptionEl,
      storageKey: STORAGE_KEY,
      indexPath: SCENARIO_INDEX_PATH
    });

    this.editor = new EncodingEditor({
      holderId: "encodingEditor"
    });
    this.generatedCode = new CodeViewer({ holderId: "generatedCode" });

    this.snippetGenerator = new SnippetGenerator();

    this.visualizationView = new VisualizationView({
      graphEl: document.getElementById("graph"),
      barChartEl: document.getElementById("barChart"),
      metaPanelEl: document.getElementById("metaPanel")
    });

    this.splitViewResizer = new SplitViewResizer({
      containerEl: document.getElementById("workspaceRow"),
      leftPaneEl: document.getElementById("codingPane"),
      rightPaneEl: document.getElementById("visualizationPane"),
      splitterEl: document.getElementById("workspaceSplitter")
    });

    this.autoRenderDelayMs = 350;
    this.autoRenderTimer = null;
  }

  async init() {
    this.splitViewResizer.init();
    this.bindEvents();
    await this.editor.init();
    await this.generatedCode.init("// Generated snippet will appear here");

    await this.demoControl.init();
    if (!this.demoControl.hasScenarios()) {
      this.setStatus("No scenarios found in examples/encoding/scenarios.index.json", true);
      return;
    }

    const { scenario } = this.demoControl.getActiveContext();
    await this.editor.setValue(scenario.encoding || {});
    await this.updateGeneratedCode();
    await this.render();
  }

  bindEvents() {
    this.loadButton.addEventListener("click", async () => {
      await this.loadScenarioAndRefresh();
    });

    this.selectEl.addEventListener("change", async () => {
      await this.loadScenarioAndRefresh();
    });

    this.editor.onChange = () => {
      void this.updateGeneratedCode();
      this.scheduleAutoRender();
    };
  }

  async loadScenarioAndRefresh() {
    const scenario = await this.safeRun(
      async () => {
        this.setStatus(`Loading demo: ${this.selectEl.value}...`);
        const loadedScenario = await this.demoControl.loadSelectedScenario();
        await this.editor.setValue(loadedScenario.encoding || {});
        await this.updateGeneratedCode();
        this.setStatus(`Loaded demo: ${loadedScenario.name || loadedScenario.id}`);
        return loadedScenario;
      },
      "Failed to load demo"
    );

    if (!scenario) return;
    await this.render();
  }

  async render() {
    await this.safeRun(
      async () => {
        const parsed = await this.editor.parseValue();
        if (parsed.error) {
          this.setStatus(`Invalid JSON: ${parsed.error.message}`, true);
          return;
        }

        const { scenario, queryText } = this.demoControl.getActiveContext();
        if (!scenario) {
          this.setStatus("Select a scenario first.", true);
          return;
        }

        this.setStatus("Rendering...");
        await this.visualizationView.render({
          scenario,
          queryText,
          encoding: parsed.value
        });

        await this.updateGeneratedCode();
        this.setStatus(`Rendered: ${scenario.name || scenario.id}`);
      },
      "Render failed"
    );
  }

  async updateGeneratedCode() {
    const parsed = await this.editor.parseValue();
    const { scenario, queryText } = this.demoControl.getActiveContext();

    if (!scenario || parsed.error) {
      await this.generatedCode.setText("// Invalid or missing encoding JSON");
      return;
    }

    await this.generatedCode.setText(this.snippetGenerator.generate({
      visType: scenario.visType || "force-graph",
      endpoint: scenario.endpoint,
      queryText,
      encoding: parsed.value
    }));
  }

  setStatus(message, isError = false) {
    this.statusEl.textContent = message || "";
    this.statusEl.classList.toggle("error", Boolean(isError));
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

  async safeRun(action, fallbackMessage) {
    try {
      return await action();
    } catch (error) {
      console.error(error);
      this.setStatus(error.message || fallbackMessage, true);
      return null;
    }
  }
}
