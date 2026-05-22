import { CodeViewer } from "./code-viewer.js";
import { EditorPanelController } from "./editor-panel-controller.js";
import { safeRun, updateStatus } from "./utils/safe-run.js";

export class SparqlPanelController extends EditorPanelController {
  constructor({
    demoControl,
    isCustomWorkspace = null,
    onContentChanged,
    onAfterReset,
    statusSelector = "#status"
  }) {
    super({ demoControl, onContentChanged, onAfterReset, statusSelector });
    this.editor = new CodeViewer({
      holderId: "sparqlEditor",
      language: "sparql",
      readOnly: false
    });
    this.isCustomWorkspace = isCustomWorkspace;
  }

  getToolbarActions() {
    return [
      ...super.getToolbarActions(),
      {
        id: "sparql-reset",
        title: "Reload base SPARQL query from demo",
        iconClass: "bi bi-arrow-counterclockwise",
        onClick: async () => this.resetToScenarioQuery()
      }
    ];
  }

  async resetToScenarioQuery() {
    await safeRun(
      async () => {
        if (this.isCustomWorkspace?.()) {
          await this.setText("");
          if (this.onAfterReset) await this.onAfterReset({ target: "query" });
          updateStatus("Custom SPARQL query cleared.", {
            statusSelector: this.statusSelector
          });
          return;
        }

        const scenario = this.demoControl.getActiveContext().scenario;
        if (!scenario) {
          updateStatus("No demo selected.", { isError: true, statusSelector: this.statusSelector });
          return;
        }

        await this.demoControl.loadSelectedScenario();
        const { queryText } = this.demoControl.getActiveContext();
        await this.setText(queryText || "");
        if (this.onAfterReset) await this.onAfterReset({ scenario, target: "query" });
        updateStatus(`Base SPARQL query reloaded: ${scenario.name || scenario.id}`, {
          statusSelector: this.statusSelector
        });
      },
      { fallbackMessage: this.getResetFailureMessage(), statusSelector: this.statusSelector }
    );
  }

  getToolbarHolderId() {
    return "sparqlToolbar";
  }

  getFallbackStem() {
    return "query";
  }

  getFileExtension() {
    return "rq";
  }

  getMimeType() {
    return "application/sparql-query";
  }

  getCopyTitle() {
    return "Copy SPARQL query";
  }

  getDownloadTitle() {
    return "Download SPARQL query";
  }

  getCopySuccessMessage() {
    return "SPARQL query copied to clipboard";
  }

  getCopyFailureMessage() {
    return "Failed to copy SPARQL query";
  }

  getDownloadFailureMessage() {
    return "Failed to download SPARQL query";
  }

  getResetFailureMessage() {
    return "Failed to restore base SPARQL query";
  }
}
