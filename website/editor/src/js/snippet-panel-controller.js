import { CodeViewer } from "./code-viewer.js";
import { EditorPanelController } from "./editor-panel-controller.js";

export class SnippetPanelController extends EditorPanelController {
  constructor({ getActiveContext, statusSelector = "#status" }) {
    super({ getActiveContext, statusSelector });
    this.editor = new CodeViewer({
      holderId: "generatedCode",
      language: "html",
      readOnly: true
    });
  }

  getToolbarHolderId() {
    return "snippetToolbar";
  }

  getFallbackStem() {
    return "integration";
  }

  getFileExtension() {
    return "html";
  }

  getMimeType() {
    return "text/html";
  }

  getCopyTitle() {
    return "Copy integration code";
  }

  getDownloadTitle() {
    return "Download integration code";
  }

  getCopySuccessMessage() {
    return "Integration code copied to clipboard";
  }

  getCopyFailureMessage() {
    return "Failed to copy integration code";
  }

  getDownloadFailureMessage() {
    return "Failed to download integration code";
  }
}
