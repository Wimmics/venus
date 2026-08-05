import { EditorPanelController } from "./editor-panel-controller.js";
import { EncodingEditor } from "./encoding-editor.js";
import { safeRun, updateStatus } from "./utils/safe-run.js";

import * as d3 from "d3"

// import { getMenuStructure } from "./encoding-snippets.js";
import { EncodingBuilder } from "./encoding-snippets.js";

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

		this.tooltip = d3.select("body")
			.append("div")
			.attr("id", "builder-tooltip")
			.style("display", "none");

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
				title: "Reload base encoding from example",
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
		holder.id = "encoding-builder"
		
		const button = document.createElement("button");
		button.type = "button";
		button.id = "encoding-builder-button"
		button.className = "btn btn-sm btn-outline-secondary";
		button.title = "Add encoding property";
		button.setAttribute("aria-label", "Add encoding property");
		button.setAttribute("aria-haspopup", "dialog");
		button.setAttribute("aria-expanded", "false");
		button.innerHTML = '<i class="bi bi-plus-lg" aria-hidden="true"></i>';
		
		// Create the dropdown menu with the encoding options
		const menu = document.createElement("div");
		menu.className = "encoding-add-menu";
		menu.id = "encoding-builder-body"
		menu.setAttribute("role", "dialog");
		menu.setAttribute("aria-label", "Add encoding property");
		menu.hidden = true;
		menu.addEventListener("click", (event) => {
			event.stopPropagation();
		});
		
		button.addEventListener("click", async (event) => {
			event.stopPropagation();
			await this.openAddMenu()
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

	closeAddMenu() {
		if (!this.addMenuEl || !this.addMenuButtonEl) return;
		this.addMenuEl.hidden = true;
		this.addMenuButtonEl.setAttribute("aria-expanded", "false");
	}

	async openAddMenu() {
		const willOpen = this.addMenuEl.hidden;
		if (willOpen) {
			await this.displayEncodingOptions(this.addMenuEl);
		}
		this.addMenuEl.hidden = !willOpen;
		this.addMenuButtonEl.setAttribute("aria-expanded", String(willOpen));
	}

	/**
	 * Creates the dropdown menu with encoding options according to the selected visualization technique
	 * @param {*} menu The DOM element containing the menu, which has been defined at init 
	 */
	async displayEncodingOptions(menu) {
		const _this = this;

		const encodingBuilder = new EncodingBuilder({ component: this.getActiveComponent() })
		await encodingBuilder.build()

		menu.innerHTML = "";

		const container = d3.select(menu)
			.classed("menu-container", true)

		// Define high-level encoding objects, such as marks, visual encodings, annotations, legends, scales
		const sections = d3.select(menu)
			.selectAll(".menu-section")
			.data(encodingBuilder.getData())
			.enter()
			.append("div")
			.classed("menu-section", true)
			.style("display", d => typeof d.display === "function" ? d.display() : "grid")

		sections
			.filter(d => !d.separator)
			.append("div")
			.classed("section-title", true)
			.text(d => d.label)

		sections
			.filter(d => d.separator)
			.append("div")
			.classed("menu-divider", true)
			.append("span")
			.text(d => d.separator);


		const rows = sections.append("div")
			.classed("section-rows", true)
			.selectAll(".sector")
			.data(d => d.values ?? [])
			.enter()
			.append("div")
			.classed("sector", true)
			.style("display", d => typeof d.display === "function" ? d.display(this.getActiveComponent()) : "grid")

		const labels = rows.append("div")
			.classed("sector-header", true);

		labels.append("span")
			.classed("sector-label", true)
			.text(d => d.label);

		labels.filter(d => d.documentation)
			.append("i")
			.classed("fa-solid fa-circle-info sector-help", true)
			.on("mouseenter", (event, d) => this.showDocumentation(event, d.documentation))
			.on("mouseleave", () => this.hideDocumentation());

		const select = rows.filter(d => d.options)
			.append("select")
			.attr("id", d => d.key)

		select.selectAll("option")
			.data(d => d.options)
			.enter()
			.append("option")
			.attr("value", d => d.value ?? "")
			.attr("title", d => d.description ?? null) // might not work for every browser
			.text(d => d.label ?? d.value)
			.each(function(d) {
				const disabled = typeof d.disabled === "function"
					? d.disabled(_this.getActiveComponent())
					: !!d.disabled;

				this.disabled = disabled;
				this.selected = !disabled && !!d.selected;
			})

		rows.append("button")
			.classed("add-button", true)
			.text("+")
			.on("click", (event, d) => this.addSnippet(d))
	}

	showDocumentation(event, doc) {

		this.tooltip
			.html(this.buildDocumentation(doc))
			.style("display", "block")
			.style("left", `${event.pageX + 12}px`)
			.style("top", `${event.pageY}px`);
	}

	hideDocumentation() {
		this.tooltip.style("display", "none");
	}

	buildDocumentation(doc) {

		let html = `<h5>${doc.description}</h5>`;

		if (doc.values) {
			html += buildValues(doc.values);
		}

		if (doc.properties) {

			html += `<br><h6>Properties</h6>`;
			html += "<table>";

			for (const p of doc.properties) {

				html += `
					<tr>
						<th>${p.name}</th>
						<td>${p.description}</td>
					</tr>
				`;
				
				if (p.values) {
					html += `
						<tr>
							<td colspan="2">
								${buildValues(p.values)}
							</td>
						</tr>
					`;
				}
			}

			html += "</table>";
		}

		function buildValues(values) {
			const hasDescriptions = values.some(v => v.description);

			return hasDescriptions
				? `
					<ul class="tooltip-values">
						${values.map(v => `
							<li><strong>${v.label ?? v}</strong> – ${v.description}</li>
						`).join("")}
					</ul>
				`
				: `
					<div class="tooltip-badges">
						${values.map(v => `
							<span class="badge bg-light text-dark border">${v.label ?? v}</span>
						`).join("")}
					</div>
				`;
		}

		return html;
	}
		
	
	
	async addSnippet(d) {
		const selectElement = document.querySelector(`#${d.key}`)
		const datum = d3.select(selectElement.options[selectElement.selectedIndex]).datum()
		console.log("datum = ", datum)

		const selectedValue = selectElement.value
		const snippet = d.action({
			datum,
			value: selectedValue, 
			component: this.getActiveComponent()
		})

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
