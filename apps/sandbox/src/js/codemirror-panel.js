import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";

export class CodeMirrorPanel {
  constructor({ holderId, readOnly = false, language = "javascript" }) {
    this.holderId = holderId;
    this.readOnly = readOnly;
    this.language = language;
    this.view = null;
    this.onChange = null;
  }

  async init(initialText = "") {
    if (this.view) return;
    const holderEl = document.getElementById(this.holderId);
    if (!holderEl) {
      throw new Error(`CodeMirror holder not found: #${this.holderId}`);
    }

    holderEl.innerHTML = "";
    const languageMap = {
      json: json(),
      html: html(),
      javascript: javascript()
    };
    const languageExt = languageMap[this.language] || javascript();

    this.view = new EditorView({
      state: EditorState.create({
        doc: String(initialText || ""),
        extensions: [
          basicSetup,
          languageExt,
          EditorState.readOnly.of(this.readOnly),
          EditorView.editable.of(!this.readOnly),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.onChange?.();
            }
          })
        ]
      }),
      parent: holderEl
    });
  }

  async setText(text) {
    if (!this.view) return;
    const value = String(text || "");
    const current = this.view.state.doc.toString();
    if (current === value) return;

    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: value }
    });
  }

  async getText() {
    if (!this.view) return "";
    return this.view.state.doc.toString();
  }
}
