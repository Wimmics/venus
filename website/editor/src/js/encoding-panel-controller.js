import { EditorPanelController } from "./editor-panel-controller.js";
import { EncodingEditor } from "./encoding-editor.js";
import { safeRun, updateStatus } from "./utils/safe-run.js";

import * as d3 from "d3"

import { getMenuStructure } from "./encoding-snippets.js";

export class EncodingPanelController extends EditorPanelController {
	constructor({
		getActiveContext,
		getCustomDefaultEncoding = null,
		getActiveComponent = null,
		onContentChanged,
		onAfterReset,
		onRun
	}) {
		super({ getActiveContext, onContentChanged, onAfterReset });
		this.editor = new EncodingEditor({ holderId: "encodingEditor" });
		this.getActiveComponent = getActiveComponent;
		this.addMenuEl = null;
		this.addMenuButtonEl = null;
		this.onRun = onRun;

		this._setEncodingRun()
	}

	_setEncodingRun() {
		document.querySelector("#encodingRunButton")
			.addEventListener("click", this.onRun)
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
				onClick: async () => this.reset()
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
		// Create the encoding add + button
		const holder = document.createElement("div");
		holder.className = "encoding-add-dropdown";
		
		const button = document.createElement("button");
		button.type = "button";
		button.className = "btn btn-sm btn-outline-secondary";
		button.title = "Add encoding property";
		button.setAttribute("aria-label", "Add encoding property");
		button.setAttribute("aria-haspopup", "dialog");
		button.setAttribute("aria-expanded", "false");
		button.innerHTML = '<i class="bi bi-plus-lg" aria-hidden="true"></i>';
		
		// Create the dropdown menu with the encoding options
		const menu = document.createElement("div");
		menu.className = "encoding-add-menu";
		menu.setAttribute("role", "dialog");
		menu.setAttribute("aria-label", "Add encoding property");
		menu.hidden = true;
		menu.addEventListener("click", (event) => {
			event.stopPropagation();
		});
		
		button.addEventListener("click", async (event) => {
			event.stopPropagation();
			const willOpen = menu.hidden;
			if (willOpen) {
				await this.displayEncodingOptions(menu);
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
	
	/**
	 * Creates the dropdown menu with encoding options according to the selected visualization technique
	 * @param {*} menu The DOM element containing the menu, which has been defined at init 
	 */
	async displayEncodingOptions(menu) {
		const _this = this;

		menu.innerHTML = "";

		const container = d3.select(menu)
			.classed("menu-container", true)

		// Define high-levek encoding objects, such as marks, channels, attributes, legends, scales
		const sections = d3.select(menu)
			.selectAll(".menu-section")
			.data(getMenuStructure())
			.enter()
			.append("div")
			.classed("menu-section", true)
			.style("display", d => typeof d.display === "function" ? d.display(this.getActiveComponent()) : "grid")

		sections.append("div")
			.classed("section-title", true)
			.text(d => d.label)

		const rows = sections.append("div")
			.classed("section-rows", true)
			.selectAll(".sector")
			.data(d => d.values)
			.enter()
			.append("div")
			.classed("sector", true)
			.style("display", d => typeof d.display === "function" ? d.display(this.getActiveComponent()) : "grid")

		rows.append("span")
			.classed("sector-label", true)
			.text(d => d.label);

		const select = rows.filter(d => d.options)
			.append("select")
			.attr("id", d => d.key)

		select.selectAll("option")
			.data(d => d.options)
			.enter()
			.append("option")
			.attr("value", d => d.value ?? "")
			.text(d => d.label ?? d.value)
			.each(function(d) {
				const disabled = typeof d.disabled === "function"
					? d.disabled(_this.getActiveComponent())
					: !!d.disabled;

				this.disabled = disabled;
				this.selected = !disabled && !!d.selected;
			});

		rows.append("button")
			.classed("add-button", true)
			.text("+")
			.on("click", (event, d) => this.addSnippet(d))
	}
	
	closeAddMenu() {
		if (!this.addMenuEl || !this.addMenuButtonEl) return;
		this.addMenuEl.hidden = true;
		this.addMenuButtonEl.setAttribute("aria-expanded", "false");
	}
	
	async addSnippet(d) {
		const selectedValue = document.querySelector(`#${d.key}`).value
		const snippet = d.action(selectedValue, this.getActiveComponent())

		this.editor.insertAtCursor(snippet)

		this.closeAddMenu()
	}
	
	async reset() {
		await safeRun(
			async () => {
				const { encoding } = await this.getActiveContext?.()
				if (!encoding) {
					updateStatus("Select a visualization template or an example first.", { isError: true })
					return;
				}
				
				await this.setValue(encoding)

				if (this.onAfterReset) await this.onAfterReset({ target: "encoding" });
			},
			{ fallbackMessage: this.getResetFailureMessage() }
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
