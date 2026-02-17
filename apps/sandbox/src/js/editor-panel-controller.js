import { TabToolbar } from "./tab-toolbar.js";
import { safeRun, updateStatus } from "./utils/safe-run.js";

export class EditorPanelController {
  constructor({ demoControl, onContentChanged = null, onAfterReset = null, statusSelector = "#status" }) {
    this.demoControl = demoControl;
    this.onContentChanged = onContentChanged;
    this.onAfterReset = onAfterReset;
    this.statusSelector = statusSelector;
    this.editor = null;
    this.toolbar = null;
  }

  setOnContentChanged(handler) {
    this.onContentChanged = handler;
  }

  async init(initialText = "") {
    if (!this.editor) {
      throw new Error(`${this.constructor.name} must initialize an editor instance.`);
    }
    await this.editor.init(initialText);
    this._bindEditorChange();
    this._initToolbar();
  }

  _bindEditorChange() {
    if (!this.editor) return;
    this.editor.onChange = () => {
      this.onContentChanged?.();
    };
  }

  _initToolbar() {
    this.toolbar = new TabToolbar({
      holderId: this.getToolbarHolderId(),
      actions: this.getToolbarActions()
    });
    this.toolbar.init();
  }

  getToolbarActions() {
    return [this._buildCopyAction(), this._buildDownloadAction()];
  }

  _buildCopyAction() {
    return {
      id: `${this.getFallbackStem()}-copy`,
      title: this.getCopyTitle(),
      iconClass: "bi bi-clipboard",
      onClick: async () => this.copyToClipboard()
    };
  }

  _buildDownloadAction() {
    return {
      id: `${this.getFallbackStem()}-download`,
      title: this.getDownloadTitle(),
      iconClass: "bi bi-download",
      onClick: async () => this.downloadFile()
    };
  }

  async copyToClipboard() {
    await safeRun(
      async () => {
        const text = await this.getText();
        await navigator.clipboard.writeText(text || "");
        updateStatus(this.getCopySuccessMessage(), { statusSelector: this.statusSelector });
      },
      { fallbackMessage: this.getCopyFailureMessage(), statusSelector: this.statusSelector }
    );
  }

  async downloadFile() {
    await safeRun(
      async () => {
        const text = await this.getText();
        const scenarioId = this._getScenarioId();
        const filename = `${this._buildSafeFileStem(scenarioId || this.getFallbackStem())}.${this.getFileExtension()}`;
        this._downloadTextFile(text, filename, this.getMimeType());
        updateStatus(`Downloaded ${filename}`, { statusSelector: this.statusSelector });
      },
      { fallbackMessage: this.getDownloadFailureMessage(), statusSelector: this.statusSelector }
    );
  }

  async getText() {
    return this.editor.getText();
  }

  async setText(text) {
    await this.editor.setText(text || "");
  }

  async setReadOnly(readOnly) {
    if (typeof this.editor.setReadOnly !== "function") return;
    await this.editor.setReadOnly(readOnly);
  }

  async refresh() {
    if (typeof this.editor.refresh !== "function") return;
    this.editor.refresh();
  }

  _getScenarioId() {
    return this.demoControl?.getActiveContext()?.scenario?.id;
  }

  _buildSafeFileStem(value) {
    return (
      String(value || "venus")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "venus"
    );
  }

  _downloadTextFile(content, filename, mimeType) {
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

  getToolbarHolderId() {
    throw new Error("getToolbarHolderId() must be implemented by subclass.");
  }

  getFallbackStem() {
    throw new Error("getFallbackStem() must be implemented by subclass.");
  }

  getFileExtension() {
    throw new Error("getFileExtension() must be implemented by subclass.");
  }

  getMimeType() {
    throw new Error("getMimeType() must be implemented by subclass.");
  }

  getCopyTitle() {
    throw new Error("getCopyTitle() must be implemented by subclass.");
  }

  getDownloadTitle() {
    throw new Error("getDownloadTitle() must be implemented by subclass.");
  }

  getCopySuccessMessage() {
    throw new Error("getCopySuccessMessage() must be implemented by subclass.");
  }

  getCopyFailureMessage() {
    throw new Error("getCopyFailureMessage() must be implemented by subclass.");
  }

  getDownloadFailureMessage() {
    throw new Error("getDownloadFailureMessage() must be implemented by subclass.");
  }
}
