import { EditorPanelController } from "./editor-panel-controller.js";
import { EncodingEditor } from "./encoding-editor.js";
import { safeRun, updateStatus } from "./utils/safe-run.js";

export class EncodingPanelController extends EditorPanelController {
  constructor({ demoControl, onContentChanged, onAfterReset, statusSelector = "#status" }) {
    super({ demoControl, onContentChanged, onAfterReset, statusSelector });
    this.editor = new EncodingEditor({ holderId: "encodingEditor" });
  }

  getToolbarActions() {
    return [
      ...super.getToolbarActions(),
      {
        id: "encoding-reset",
        title: "Reload base encoding from demo",
        iconClass: "bi bi-arrow-counterclockwise",
        onClick: async () => this.resetToScenarioEncoding()
      }
    ];
  }

  async setValue(value) {
    await this.editor.setValue(value);
  }

  async parseValue() {
    return this.editor.parseValue();
  }

  async resetToScenarioEncoding() {
    await safeRun(
      async () => {
        const scenario = this.demoControl.getActiveContext().scenario;
        if (!scenario) {
          updateStatus("No demo selected.", { isError: true, statusSelector: this.statusSelector });
          return;
        }

        await this.setValue(scenario.encoding || {});
        if (this.onAfterReset) await this.onAfterReset({ scenario, target: "encoding" });
        updateStatus(`Base encoding reloaded: ${scenario.name || scenario.id}`, {
          statusSelector: this.statusSelector
        });
      },
      { fallbackMessage: this.getResetFailureMessage(), statusSelector: this.statusSelector }
    );
  }

  getToolbarHolderId() {
    return "encodingToolbar";
  }

  getFallbackStem() {
    return "encoding";
  }

  getFileExtension() {
    return "json";
  }

  getMimeType() {
    return "application/json";
  }

  getCopyTitle() {
    return "Copy encoding JSON";
  }

  getDownloadTitle() {
    return "Download encoding JSON";
  }

  getCopySuccessMessage() {
    return "Encoding JSON copied to clipboard";
  }

  getCopyFailureMessage() {
    return "Failed to copy encoding JSON";
  }

  getDownloadFailureMessage() {
    return "Failed to download encoding JSON";
  }

  getResetFailureMessage() {
    return "Failed to restore base encoding";
  }
}
