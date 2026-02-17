import { CodeMirrorPanel } from "./codemirror-panel.js";

export class CodeViewer {
  constructor({ holderId, language = "html", readOnly = true }) {
    this.panel = new CodeMirrorPanel({ holderId, readOnly, language });
    this.onChange = null;
  }

  async init(initialText = "") {
    this.panel.onChange = () => {
      this.onChange?.();
    };
    await this.panel.init(initialText);
  }

  async setText(text) {
    await this.panel.setText(text || "");
  }

  async getText() {
    return this.panel.getText();
  }

  async setReadOnly(readOnly) {
    await this.panel.setReadOnly(readOnly);
  }
}
