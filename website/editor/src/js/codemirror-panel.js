import { basicSetup } from "codemirror";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { html } from "@codemirror/lang-html";
// For JSON and syntax/error highlighting
import { lintGutter, linter } from "@codemirror/lint";
import { json, jsonParseLinter } from "@codemirror/lang-json";

import { javascript } from "@codemirror/lang-javascript";
import { sparql } from "codemirror-lang-sparql";

export class CodeMirrorPanel {
  constructor({ holderId, readOnly = false, language = "javascript" }) {
    this.holderId = holderId;
    this.readOnly = readOnly;
    this.language = language;
    this.view = null;
    this.onChange = null;
    this.readOnlyCompartment = new Compartment();
    this.editableCompartment = new Compartment();
  }

  async init(initialText = "") {
    if (this.view) return;
    const holderEl = document.getElementById(this.holderId);
    if (!holderEl) {
      throw new Error(`CodeMirror holder not found: #${this.holderId}`);
    }

    holderEl.innerHTML = "";
    const languageMap = {
      json: [
        json(),
        linter(jsonParseLinter()),
        lintGutter()
      ],
      html: html(),
      javascript: javascript(),
      sparql: sparql()
    };
    const languageExt = languageMap[this.language] || javascript();

    this.view = new EditorView({
      state: EditorState.create({
        doc: String(initialText || ""),
        extensions: [
          basicSetup,
          ...(Array.isArray(languageExt) ? languageExt : [languageExt]),
          this.readOnlyCompartment.of(EditorState.readOnly.of(this.readOnly)),
          this.editableCompartment.of(EditorView.editable.of(!this.readOnly)),
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

  async insertAtCursor(text){
    if (!this.view) return

    this.view.dispatch({
      changes: {
        from: this.view.state.selection.main.from,
        to: this.view.state.selection.main.to, // replace selection if any
        insert: text
      }
    });
  }

  async getText() {
    if (!this.view) return "";
    return this.view.state.doc.toString();
  }

  async setReadOnly(readOnly) {
    this.readOnly = Boolean(readOnly);
    if (!this.view) return;

    this.view.dispatch({
      effects: [
        this.readOnlyCompartment.reconfigure(EditorState.readOnly.of(this.readOnly)),
        this.editableCompartment.reconfigure(EditorView.editable.of(!this.readOnly))
      ]
    });
  }
}
