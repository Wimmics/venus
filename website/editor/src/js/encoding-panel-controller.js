import { EditorPanelController } from "./editor-panel-controller.js";
import { EncodingEditor } from "./encoding-editor.js";
import { insertEncodingSnippet } from "./encoding-authoring/encoding-insertion.js";
import { getEncodingAddPicker } from "./encoding-authoring/encoding-snippets.js";
import { safeRun, updateStatus } from "./utils/safe-run.js";

import * as d3 from "d3"

import { getMenuStructure } from "./constants.js";

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
		const parsed = await this.parseValue();
		console.log("parsed =", parsed)
		console.log('activeComponent = ', this.getActiveComponent())
		// const picker = getEncodingAddPicker(
		// 	this.getActiveComponent?.(),
		// 	parsed.error ? {} : parsed.value
		// );
		// console.log("picker = ", picker)
		menu.innerHTML = "";

		const container = d3.select(menu)
			.classed("menu-container", true)

		// Define high-levek encoding objects, such as marks, channels, attributes, legends, scales
		const sections = d3.select(menu)
			.selectAll(".menu-section")
			.data(getMenuStructure())
			.enter()
			.append("div")
			.classed("menu-section", true);

		sections.append("div")
			.classed("section-title", true)
			.text(d => d.label);

		const rows = sections.append("div")
			.classed("section-rows", true)
			.selectAll(".sector")
			.data(d => d.values)
			.enter()
			.append("div")
			.classed("sector", true);

		rows.append("span")
			.classed("sector-label", true)
			.text(d => d.label);

		const select = rows.filter(d => d.options)
			.append("select");

		select.selectAll("option")
			.data(d => d.options)
			.enter()
			.append("option")
			.attr("value", d => d.key)
			.text(d => d.label)
			.property("selected", d => d.selected)
			.property("disabled", (d,i) => i === 0)

		rows.append("button")
			.classed("add-button", true)
			.text("+");
			
		
		



		
		// const createBranch = (label, className) => {
		// 	const branch = document.createElement("details");
		// 	branch.className = `encoding-add-tree-branch ${className}`.trim();
			
		// 	const summary = document.createElement("summary");
		// 	summary.textContent = label;
			
		// 	const children = document.createElement("div");
		// 	children.className = "encoding-add-tree-children";
		// 	branch.append(summary, children);
		// 	return { branch, children };
		// };
		
		// const createAction = (label, snippet, className = "") => {
		// 	const button = document.createElement("button");
		// 	button.type = "button";
		// 	button.className = `encoding-add-tree-action ${className}`.trim();
		// 	button.textContent = label;
		// 	button.addEventListener("click", async () => {
		// 		await this.addSnippet(snippet);
		// 		this.closeAddMenu();
		// 	});
		// 	return button;
		// };
		
		// const appendProperties = (holder, properties = []) => {
		// 	for (const item of properties) {
		// 		if (item.variants.length === 1 && item.variants[0].label === "Add") {
		// 			holder.appendChild(createAction(item.label, item.variants[0].snippet));
		// 			continue;
		// 		}
				
		// 		const property = createBranch(item.label, "encoding-add-tree-property");
		// 		for (const option of item.variants) {
		// 			property.children.appendChild(
		// 				createAction(option.label, option.snippet, "encoding-add-tree-variant")
		// 			);
		// 		}
		// 		holder.appendChild(property.branch);
		// 	}
		// };
		
		// const tree = document.createElement("div");
		// tree.className = "encoding-add-tree";
		// for (const scope of picker.scopes) {
		// 	if (scope.variants) {
		// 		appendProperties(tree, [scope]);
		// 		continue;
		// 	}
			
		// 	const scopeBranch = createBranch(scope.label, "encoding-add-tree-scope");
			
		// 	if (scope.roles) {
		// 		for (const role of scope.roles) {
		// 			const roleBranch = createBranch(`${role.label} nodes`, "encoding-add-tree-role");
		// 			appendProperties(roleBranch.children, role.properties);
		// 			scopeBranch.children.appendChild(roleBranch.branch);
		// 		}
		// 	} else {
		// 		appendProperties(scopeBranch.children, scope.properties);
		// 	}
			
		// 	tree.appendChild(scopeBranch.branch);
		// }
		
		// menu.appendChild(tree);
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
				insertion.status === "removed"
				? "removed from"
				: insertion.status === "completed"
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
