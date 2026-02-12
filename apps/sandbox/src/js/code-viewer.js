import { CodeMirrorPanel } from "./codemirror-panel.js";

export class CodeViewer {
  constructor({ holderId }) {
    this.panel = new CodeMirrorPanel({ holderId, readOnly: true, language: "html" });
  }

  async init(initialText = "") {
    await this.panel.init(initialText);
  }

  async setText(text) {
    await this.panel.setText(text || "");
  }

  async getText() {
    return this.panel.getText();
  }
}
