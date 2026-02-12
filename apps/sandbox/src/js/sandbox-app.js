import { SCENARIO_INDEX_PATH, STORAGE_KEY } from "./constants.js";
import { DemoControl } from "./demo-control.js";
import { EncodingEditor } from "./encoding-editor.js";
import { SnippetGenerator } from "./snippet-generator.js";
import { VisualizationView } from "./visualization-view.js";
import { CodeViewer } from "./code-viewer.js";
import { SplitViewResizer } from "./split-view-resizer.js";
import { TabToolbar } from "./tab-toolbar.js";

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

    this.snippetToolbar = new TabToolbar({
      holderId: "snippetToolbar",
      actions: [
        {
          id: "snippet-copy",
          title: "Copy generated HTML / JS",
          iconClass: "bi bi-clipboard",
          onClick: async () => this.copySnippetToClipboard()
        },
        {
          id: "snippet-download",
          title: "Download generated HTML / JS",
          iconClass: "bi bi-download",
          onClick: async () => this.downloadGeneratedSnippet()
        }
      ]
    });
  }

  async init() {
    this.splitViewResizer.init();
    this.bindEvents();
    this.encodingToolbar.init();
    this.snippetToolbar.init();
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

  async copyEncodingToClipboard() {
    await this.safeRun(
      async () => {
        const text = await this.editor.getText();
        await navigator.clipboard.writeText(text || "");
        this.setStatus("Encoding JSON copied to clipboard");
      },
      "Failed to copy encoding JSON"
    );
  }

  async copySnippetToClipboard() {
    await this.safeRun(
      async () => {
        const text = await this.generatedCode.getText();
        await navigator.clipboard.writeText(text || "");
        this.setStatus("Generated HTML / JS copied to clipboard");
      },
      "Failed to copy generated snippet"
    );
  }

  async downloadEncodingJson() {
    await this.safeRun(
      async () => {
        const { scenario } = this.demoControl.getActiveContext();
        const text = await this.editor.getText();
        const filename = `${this.buildSafeFileStem(scenario?.id || "encoding")}.json`;
        this.downloadTextFile(text, filename, "application/json");
        this.setStatus(`Downloaded ${filename}`);
      },
      "Failed to download encoding JSON"
    );
  }

  async downloadGeneratedSnippet() {
    await this.safeRun(
      async () => {
        const { scenario } = this.demoControl.getActiveContext();
        const text = await this.generatedCode.getText();
        const filename = `${this.buildSafeFileStem(scenario?.id || "snippet")}.html`;
        this.downloadTextFile(text, filename, "text/html");
        this.setStatus(`Downloaded ${filename}`);
      },
      "Failed to download generated snippet"
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

        await this.editor.setValue(scenario.encoding || {});
        await this.updateGeneratedCode();
        await this.render();
        this.setStatus(`Base encoding reloaded: ${scenario.name || scenario.id}`);
      },
      "Failed to restore base encoding"
    );
  }

  buildSafeFileStem(value) {
    return String(value || "kgnovis")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "kgnovis";
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
