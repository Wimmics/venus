import { EditorPanelController } from "./editor-panel-controller.js";
import { EncodingEditor } from "./encoding-editor.js";
import { insertEncodingSnippet } from "./encoding-authoring/encoding-insertion.js";
import { getEncodingSnippetGroups } from "./encoding-authoring/encoding-snippets.js";
import { safeRun, updateStatus } from "./utils/safe-run.js";

export class EncodingPanelController extends EditorPanelController {
  constructor({
    demoControl,
    isCustomWorkspace = null,
    getCustomDefaultEncoding = null,
    getActiveComponent = null,
    onContentChanged,
    onAfterReset,
    statusSelector = "#status"
  }) {
    super({ demoControl, onContentChanged, onAfterReset, statusSelector });
    this.editor = new EncodingEditor({ holderId: "encodingEditor" });
    this.isCustomWorkspace = isCustomWorkspace;
    this.getCustomDefaultEncoding = getCustomDefaultEncoding;
    this.getActiveComponent = getActiveComponent;
    this.addMenuEl = null;
    this.addMenuButtonEl = null;
  }

  getToolbarActions() {
    return [
      {
        id: "encoding-add",
        createElement: () => this.createAddMenu()
      },
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

  createAddMenu() {
    const holder = document.createElement("div");
    holder.className = "encoding-add-dropdown";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm btn-outline-secondary";
    button.title = "Add encoding property";
    button.setAttribute("aria-label", "Add encoding property");
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = '<i class="bi bi-plus-lg" aria-hidden="true"></i>';

    const menu = document.createElement("div");
    menu.className = "encoding-add-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = menu.hidden;
      if (willOpen) {
        this.rebuildAddMenu(menu);
      }
      menu.hidden = !willOpen;
      button.setAttribute("aria-expanded", String(willOpen));
    });

    document.addEventListener("click", (event) => {
      if (!holder.contains(event.target)) {
        this.closeAddMenu();
      }
    });

    holder.append(button, menu);
    this.addMenuEl = menu;
    this.addMenuButtonEl = button;
    return holder;
  }

  rebuildAddMenu(menu) {
    menu.innerHTML = "";
    const groups = getEncodingSnippetGroups(this.getActiveComponent?.());

    for (const group of groups) {
      const section = document.createElement("section");
      section.className = "encoding-add-group";

      const heading = document.createElement("div");
      heading.className = "encoding-add-group-label";
      heading.textContent = group.label;
      section.appendChild(heading);

      for (const snippet of group.items) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "encoding-add-option";
        button.setAttribute("role", "menuitem");
        button.textContent = snippet.label;
        button.addEventListener("click", async () => {
          await this.addSnippet(snippet);
          this.closeAddMenu();
        });
        section.appendChild(button);
      }

      menu.appendChild(section);
    }
  }

  closeAddMenu() {
    if (!this.addMenuEl || !this.addMenuButtonEl) return;
    this.addMenuEl.hidden = true;
    this.addMenuButtonEl.setAttribute("aria-expanded", "false");
  }

  async addSnippet(snippet) {
    await safeRun(
      async () => {
        const parsed = await this.parseValue();
        if (parsed.error) {
          updateStatus(`Invalid encoding JSON: ${parsed.error.message}`, {
            isError: true,
            statusSelector: this.statusSelector
          });
          return;
        }

        const insertion = insertEncodingSnippet(parsed.value, snippet);
        if (!insertion.changed) {
          updateStatus(`${snippet.label} is already present.`, {
            statusSelector: this.statusSelector
          });
          return;
        }

        await this.setValue(insertion.value);
        const action =
          insertion.status === "completed"
            ? "completed in"
            : insertion.status === "replaced"
              ? "updated in"
              : "added to";
        updateStatus(
          `${snippet.label} ${action} encoding.`,
          { statusSelector: this.statusSelector }
        );
      },
      { fallbackMessage: "Failed to add encoding property", statusSelector: this.statusSelector }
    );
  }

  async resetToScenarioEncoding() {
    await safeRun(
      async () => {
        if (this.isCustomWorkspace?.()) {
          const defaultEncoding = await this.getCustomDefaultEncoding?.();
          if (!defaultEncoding) {
            updateStatus("Select a chart type first.", {
              isError: true,
              statusSelector: this.statusSelector
            });
            return;
          }

          await this.setValue(defaultEncoding);
          if (this.onAfterReset) await this.onAfterReset({ target: "encoding" });
          updateStatus("Default chart encoding reloaded.", {
            statusSelector: this.statusSelector
          });
          return;
        }

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
