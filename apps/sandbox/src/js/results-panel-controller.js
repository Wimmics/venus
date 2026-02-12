import { CodeViewer } from "./code-viewer.js";
import { EditorPanelController } from "./editor-panel-controller.js";

export class ResultsPanelController extends EditorPanelController {
  constructor({ demoControl, onContentChanged, statusSelector = "#status" }) {
    super({ demoControl, onContentChanged, statusSelector });
    this.editor = new CodeViewer({
      holderId: "sparqlResults",
      language: "json",
      readOnly: false
    });
  }

  async parseJson() {
    const raw = await this.getText();
    try {
      return { value: JSON.parse(raw), error: null };
    } catch (error) {
      return { value: null, error };
    }
  }

  getToolbarHolderId() {
    return "resultsToolbar";
  }

  getFallbackStem() {
    return "results";
  }

  getFileExtension() {
    return "json";
  }

  getMimeType() {
    return "application/json";
  }

  getCopyTitle() {
    return "Copy SPARQL results JSON";
  }

  getDownloadTitle() {
    return "Download SPARQL results JSON";
  }

  getCopySuccessMessage() {
    return "SPARQL results copied to clipboard";
  }

  getCopyFailureMessage() {
    return "Failed to copy SPARQL results JSON";
  }

  getDownloadFailureMessage() {
    return "Failed to download SPARQL results JSON";
  }
}
