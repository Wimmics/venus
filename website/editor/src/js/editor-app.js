import {
	DEFAULT_CUSTOM_TEMPLATE_ID,
	SCENARIO_INDEX_PATH,
	STORAGE_KEY,
	VISUALIZATION_TEMPLATES
} from "./constants.js";
import { DemoControl } from "./demo-control.js";
import { SnippetGenerator } from "./snippet-generator.js";
import { VisualizationView } from "./visualization-view.js";
import { SplitViewResizer } from "./split-view-resizer.js";
import { SparqlPanelController } from "./sparql-panel-controller.js";
import { EncodingPanelController } from "./encoding-panel-controller.js";
import { ResultsPanelController } from "./results-panel-controller.js";
import { SnippetPanelController } from "./snippet-panel-controller.js";
import { fetchJson } from "./utils/http-utils.js";
import { safeRun, updateStatus } from "./utils/safe-run.js";

export class EditorApp {
	constructor() {
		this.selectEl = document.getElementById("scenarioSelect");
		this.examplesDropdownEl = document.getElementById("examplesDropdown");
		this.examplesDropdownButtonEl = document.getElementById("examplesDropdownButton");
		this.examplesDropdownMenuEl = document.getElementById("examplesDropdownMenu");
		this.visualizationTypeDropdownEl = document.getElementById("visualizationTypeDropdown");
		this.visualizationTypeDropdownButtonEl = document.getElementById("visualizationTypeDropdownButton");
		this.visualizationTypeDropdownMenuEl = document.getElementById("visualizationTypeDropdownMenu");
		this.exportDropdownEl = document.getElementById("exportDropdown");
		this.exportDropdownButtonEl = document.getElementById("exportDropdownButton");
		this.exportDropdownMenuEl = document.getElementById("exportDropdownMenu");
		
		this.endpointInputEl = document.getElementById("endpointInput");
		this.resultsAsSourceToggleEl = document.getElementById("resultsAsSourceToggle");
		this.visualizationTabButton = document.getElementById("visualization-tab");
		
		this.demoControl = new DemoControl({
			selectEl: this.selectEl,
			storageKey: STORAGE_KEY,
			indexPath: SCENARIO_INDEX_PATH
		});
		
		this.snippetGenerator = new SnippetGenerator();
		this.visualizationView = new VisualizationView({
			hostEl: document.getElementById("visualizationHost"),
			metaPanelEl: document.getElementById("metaPanel")
		});
		
		this.splitViewResizer = new SplitViewResizer({
			containerEl: document.getElementById("workspaceRow"),
			panes: {
				config: document.getElementById("configPane"),
				data: document.getElementById("dataPane"),
				result: document.getElementById("resultPane")
			},
			splitters: {
				configData: document.getElementById("splitterConfigData"),
				dataResult: document.getElementById("splitterDataResult")
			}
		});
		
		this.autoRenderDelayMs = 350;
		this.autoRenderTimer = null;
		this.lastRenderedSparqlData = null;
		this.isScenarioLoading = false;
		this.workspace = {
			mode: "example",
			templateId: DEFAULT_CUSTOM_TEMPLATE_ID,
			component: null
		};
		
		this.sparqlPanelController = new SparqlPanelController({
			demoControl: this.demoControl,
			isCustomWorkspace: () => this.isCustomWorkspace(),
			onContentChanged: () => {
				this.scheduleAutoRender();
				void this.updateGeneratedCode();
			},
			onAfterReset: async () => {
				await this.updateGeneratedCode();
				await this.render();
			}
		});
		
		this.encodingPanelController = new EncodingPanelController({
			demoControl: this.demoControl,
			isCustomWorkspace: () => this.isCustomWorkspace(),
			getCustomDefaultEncoding: () => this.fetchEncodingForActiveTemplate(),
			getActiveComponent: () => this.getActiveComponent(),
			onContentChanged: () => {
				this.scheduleAutoRender();
				void this.updateGeneratedCode();
			},
			onAfterReset: async () => {
				await this.updateGeneratedCode();
				await this.render();
			}
		});
		
		this.resultsPanelController = new ResultsPanelController({
			demoControl: this.demoControl,
			onContentChanged: () => {
				if (this.getDataSourceMode() !== "provided") return;
				this.scheduleAutoRender();
				void this.updateGeneratedCode();
			}
		});
		
		this.snippetPanelController = new SnippetPanelController({
			demoControl: this.demoControl
		});
	}
	
	async init() {
		this.splitViewResizer.init();
		this.bindEvents();
		await this.sparqlPanelController.init("");
		await this.encodingPanelController.init();
		await this.resultsPanelController.init("{}");
		await this.resultsPanelController.setReadOnly(true);
		await this.snippetPanelController.init("// Generated integration snippet will appear here");
		
		await this.demoControl.init();
		this.setupVisualizationTypeDropdown();
		this.setupExamplesDropdown();
		this.setupExportDropdown();
		if (!this.demoControl.hasScenarios()) {
			this.setStatus("No scenarios found in examples/encoding/scenarios.index.json", true);
			return;
		}
		
		await this.loadScenarioAndRefresh();
	}
	
	bindEvents() {
		this.selectEl.addEventListener("change", async () => {
			await this.loadScenarioAndRefresh();
			this.syncExamplesDropdownState();
		});
		
		this.endpointInputEl.addEventListener("input", () => {
			this.scheduleAutoRender();
			void this.updateGeneratedCode();
		});
		
		this.resultsAsSourceToggleEl.addEventListener("change", async () => {
			await this.applyResultsEditorMode();
			this.scheduleAutoRender();
			void this.updateGeneratedCode();
		});
		
		this.visualizationTabButton.addEventListener("shown.bs.tab", () => {
			this.refreshVisualizationTab();
		});
		
	}
	
	async loadScenarioAndRefresh() {
		if (this.autoRenderTimer) {
			clearTimeout(this.autoRenderTimer);
			this.autoRenderTimer = null;
		}
		
		this.isScenarioLoading = true;
		await this.safeRun(
			async () => {
				this.setStatus(`Loading demo: ${this.selectEl.value}...`);
				
				const loadedScenario = await this.demoControl.loadSelectedScenario();
				const { queryText } = this.demoControl.getActiveContext();
				this.activateExampleWorkspace(loadedScenario);
				
				this.endpointInputEl.value = loadedScenario.endpoint || "";
				await this.applyResultsEditorMode();
				
				await this.sparqlPanelController.setText(queryText || "");
				await this.encodingPanelController.setValue(loadedScenario.encoding || {});
				await this.resultsPanelController.setText(
					JSON.stringify(loadedScenario.sparqlResult || loadedScenario.results || {}, null, 2)
				);
				
				await this.updateGeneratedCode();
				await this.render();
				this.syncExamplesDropdownState();
				this.syncVisualizationTypeDropdownState();
				
				this.setStatus(`Loaded demo: ${loadedScenario.name || loadedScenario.id}`);
			},
			"Failed to load demo"
		);
		this.isScenarioLoading = false;
	}
	
	setupExamplesDropdown() {
		if (
			!this.selectEl ||
			!this.examplesDropdownEl ||
			!this.examplesDropdownButtonEl ||
			!this.examplesDropdownMenuEl
		) {
			return;
		}
		
		this.rebuildExamplesDropdownMenu();
		this.syncExamplesDropdownState();
		
		if (this.examplesDropdownEl.dataset.bound === "1") return;
		this.examplesDropdownEl.dataset.bound = "1";
		
		this.examplesDropdownButtonEl.addEventListener("click", (event) => {
			event.stopPropagation();
			const willOpen = this.examplesDropdownMenuEl.hidden;
			this.examplesDropdownMenuEl.hidden = !willOpen;
			this.examplesDropdownButtonEl.setAttribute("aria-expanded", String(willOpen));
			if (willOpen) this.closeVisualizationTypeDropdown();
		});
		
		document.addEventListener("click", (event) => {
			if (!this.examplesDropdownEl.contains(event.target)) {
				this.closeExamplesDropdown();
			}
		});
	}
	
	setupVisualizationTypeDropdown() {
		if (
			!this.visualizationTypeDropdownEl ||
			!this.visualizationTypeDropdownButtonEl ||
			!this.visualizationTypeDropdownMenuEl
		) {
			return;
		}
		
		this.rebuildVisualizationTypeDropdownMenu();
		this.syncVisualizationTypeDropdownState();
		
		if (this.visualizationTypeDropdownEl.dataset.bound === "1") return;
		this.visualizationTypeDropdownEl.dataset.bound = "1";
		
		this.visualizationTypeDropdownButtonEl.addEventListener("click", (event) => {
			event.stopPropagation();
			const willOpen = this.visualizationTypeDropdownMenuEl.hidden;
			this.visualizationTypeDropdownMenuEl.hidden = !willOpen;
			this.visualizationTypeDropdownButtonEl.setAttribute("aria-expanded", String(willOpen));
			if (willOpen) this.closeExamplesDropdown();
		});
		
		document.addEventListener("click", (event) => {
			if (!this.visualizationTypeDropdownEl.contains(event.target)) {
				this.closeVisualizationTypeDropdown();
			}
		});
	}
	
	setupExportDropdown() {
		if (!this.exportDropdownEl || !this.exportDropdownButtonEl || !this.exportDropdownMenuEl) return;
		if (this.exportDropdownEl.dataset.bound === "1") return;
		this.exportDropdownEl.dataset.bound = "1";
		
		this.exportDropdownButtonEl.addEventListener("click", (event) => {
			event.stopPropagation();
			const willOpen = this.exportDropdownMenuEl.hidden;
			this.exportDropdownMenuEl.hidden = !willOpen;
			this.exportDropdownButtonEl.setAttribute("aria-expanded", String(willOpen));
		});
		
		this.exportDropdownMenuEl.querySelectorAll(".editor-export-option").forEach((button) => {
			button.addEventListener("click", async () => {
				const format = button.dataset.format;
				this.closeExportDropdown();
				await this.exportVisualization(format);
			});
		});
		
		document.addEventListener("click", (event) => {
			if (!this.exportDropdownEl.contains(event.target)) {
				this.closeExportDropdown();
			}
		});
	}
	
	closeExportDropdown() {
		if (!this.exportDropdownMenuEl || !this.exportDropdownButtonEl) return;
		this.exportDropdownMenuEl.hidden = true;
		this.exportDropdownButtonEl.setAttribute("aria-expanded", "false");
	}
	
	rebuildExamplesDropdownMenu() {
		if (!this.examplesDropdownMenuEl || !this.selectEl) return;
		this.examplesDropdownMenuEl.innerHTML = "";
		
		const options = Array.from(this.selectEl.options);
		for (const option of options) {
			const item = document.createElement("button");
			item.type = "button";
			item.className = "editor-create-option";
			item.setAttribute("role", "menuitem");
			item.dataset.value = option.value;
			item.textContent = option.textContent || option.value;
			item.addEventListener("click", () => {
				if (this.selectEl.value !== option.value || this.isCustomWorkspace()) {
					this.selectEl.value = option.value;
					this.selectEl.dispatchEvent(new Event("change", { bubbles: true }));
				}
				this.closeExamplesDropdown();
			});
			this.examplesDropdownMenuEl.appendChild(item);
		}
	}
	
	closeExamplesDropdown() {
		if (!this.examplesDropdownMenuEl || !this.examplesDropdownButtonEl) return;
		this.examplesDropdownMenuEl.hidden = true;
		this.examplesDropdownButtonEl.setAttribute("aria-expanded", "false");
	}
	
	syncExamplesDropdownState() {
		if (!this.selectEl || !this.examplesDropdownMenuEl) return;
		
		this.examplesDropdownMenuEl.querySelectorAll(".editor-create-option").forEach((item) => {
			item.classList.toggle(
				"is-active",
				!this.isCustomWorkspace() && item.dataset.value === this.selectEl.value
			);
		});
	}
	
	rebuildVisualizationTypeDropdownMenu() {
		if (!this.visualizationTypeDropdownMenuEl) return;
		this.visualizationTypeDropdownMenuEl.innerHTML = "";
		for (const template of VISUALIZATION_TEMPLATES) {
			const item = document.createElement("button");
			item.type = "button";
			item.className = "editor-create-option";
			item.setAttribute("role", "menuitem");
			item.dataset.templateId = template.id;
			item.textContent = template.label;
			item.addEventListener("click", async () => {
				await this.startCustomWorkspace(template.id);
				this.closeVisualizationTypeDropdown();
			});
			this.visualizationTypeDropdownMenuEl.appendChild(item);
		}
		
		this.syncVisualizationTypeDropdownState();
	}
	
	closeVisualizationTypeDropdown() {
		if (!this.visualizationTypeDropdownMenuEl || !this.visualizationTypeDropdownButtonEl) return;
		this.visualizationTypeDropdownMenuEl.hidden = true;
		this.visualizationTypeDropdownButtonEl.setAttribute("aria-expanded", "false");
	}
	
	syncVisualizationTypeDropdownState() {
		if (!this.visualizationTypeDropdownMenuEl) return;
		const activeTemplate = this.getActiveTemplate();
		
		this.visualizationTypeDropdownMenuEl.querySelectorAll(".editor-create-option").forEach((item) => {
			item.classList.toggle(
				"is-active",
				this.isCustomWorkspace() && item.dataset.templateId === activeTemplate?.id
			);
		});
	}
	
	activateExampleWorkspace(scenario) {
		const template = this.getTemplateByComponent(scenario?.component);
		this.workspace = {
			mode: "example",
			templateId: template?.id || DEFAULT_CUSTOM_TEMPLATE_ID,
			component: scenario?.component || template?.component || "venus-graph"
		};
	}
	
	async startCustomWorkspace(templateId = DEFAULT_CUSTOM_TEMPLATE_ID) {
		if (this.autoRenderTimer) {
			clearTimeout(this.autoRenderTimer);
			this.autoRenderTimer = null;
		}
		
		await this.safeRun(
			async () => {
				this.isScenarioLoading = true;
				const template = this.getTemplateById(templateId);
				this.workspace = {
					mode: "custom",
					templateId: template.id,
					component: template.component
				};
				
				this.endpointInputEl.value = "";
				this.resultsAsSourceToggleEl.checked = false;
				await this.applyResultsEditorMode();
				await this.sparqlPanelController.setText("");
				await this.encodingPanelController.setValue(await this.fetchTemplateEncoding(template));
				await this.resultsPanelController.setText("{}");
				this.lastRenderedSparqlData = null;
				this.visualizationView.clear();
				this.syncExamplesDropdownState();
				this.syncVisualizationTypeDropdownState();
				await this.updateGeneratedCode();
				this.setStatus(`${template.label} workspace ready.`);
			},
			"Failed to create visualization from type"
		);
		this.isScenarioLoading = false;
	}
	
	async exportVisualization(format) {
		await this.safeRun(
			async () => {
				const { scenario } = this.demoControl.getActiveContext();
				const activeTemplate = this.getActiveTemplate();
				const stem = this._buildFileStem(
					this.isCustomWorkspace()
					? `custom-${activeTemplate?.id || "visualization"}`
					: scenario?.name || scenario?.id || "venus-visualization"
				);
				this.setStatus(`Exporting ${String(format || "").toUpperCase()}...`);
				await this.visualizationView.exportAs(format, stem);
				this.setStatus(`Exported ${String(format || "").toUpperCase()} successfully`);
			},
			"Failed to export visualization"
		);
	}
	
	async render() {
		await this.safeRun(
			async () => {
				const parsedEncoding = await this.encodingPanelController.parseValue();
				if (parsedEncoding.error) {
					this.setStatus(`Invalid encoding JSON: ${parsedEncoding.error.message}`, true);
					return;
				}
				
				const { scenario } = this.demoControl.getActiveContext();
				const component = this.getActiveComponent();
				if (!component) {
					this.setStatus("Select an example or chart type first.", true);
					return;
				}
				
				const endpoint = this._resolveEndpoint(this.isCustomWorkspace() ? "" : scenario?.endpoint);
				const dataSource = this.getDataSourceMode();
				const canUseScenarioCache =
					!this.isCustomWorkspace() &&
					dataSource === "query" &&
					scenario?.hasCachedResult === true;
				const renderDataSource = canUseScenarioCache ? "provided" : dataSource;
				const queryText = await this.sparqlPanelController.getText();
				if (renderDataSource === "query" && !String(queryText || "").trim()) {
					this.setStatus("Enter a SPARQL query to render the selected chart.", true);
					return;
				}
				
				let providedSparqlResult = null;
				if (renderDataSource === "provided") {
					if (canUseScenarioCache) {
						providedSparqlResult = scenario.sparqlResult;
					} else {
						const parsedResults = await this.resultsPanelController.parseJson();
						if (parsedResults.error) {
							this.setStatus(`Invalid SPARQL Results JSON: ${parsedResults.error.message}`, true);
							return;
						}
						providedSparqlResult = parsedResults.value;
					}
				}
				
				this.setStatus("Rendering...");
				const output = await this.visualizationView.render({
					component,
					scenario,
					endpoint,
					queryText,
					encoding: parsedEncoding.value,
					dataSource: renderDataSource,
					sparqlResult: providedSparqlResult
				});
				
				this.lastRenderedSparqlData = output?.sparqlData || null;
				
				if (dataSource === "query") {
					await this.resultsPanelController.setText(JSON.stringify(this.lastRenderedSparqlData || {}, null, 2));
				}
				
				await this.updateGeneratedCode();
				this.setStatus(`Rendered: ${this.getActiveWorkspaceLabel()}`);
			},
			"Render failed"
		);
	}
	
	async updateGeneratedCode() {
		const parsedEncoding = await this.encodingPanelController.parseValue();
		const { scenario } = this.demoControl.getActiveContext();
		const component = this.getActiveComponent();
		if (!component || parsedEncoding.error) {
			await this.snippetPanelController.setText("// Invalid or missing configuration");
			return;
		}
		
		const dataSource = this.getDataSourceMode();
		const endpoint = this._resolveEndpoint(this.isCustomWorkspace() ? "" : scenario?.endpoint);
		const queryText = await this.sparqlPanelController.getText();
		const parsedResults = dataSource === "provided"
		? await this.resultsPanelController.parseJson()
		: { value: null, error: null };
		if (parsedResults.error) {
			await this.snippetPanelController.setText("// Invalid SPARQL Results JSON for provided data mode");
			return;
		}
		
		await this.snippetPanelController.setText(
			this.snippetGenerator.generate({
				component,
				endpoint,
				queryText,
				encoding: parsedEncoding.value,
				dataSource,
				sparqlResult: parsedResults.value
			})
		);
	}
	
	_resolveEndpoint(fallback = "") {
		const typed = String(this.endpointInputEl.value || "").trim();
		return typed || fallback || "https://dbpedia.org/sparql";
	}
	
	getDataSourceMode() {
		return this.resultsAsSourceToggleEl.checked ? "provided" : "query";
	}
	
	async applyResultsEditorMode() {
		const useResultsAsSource = this.getDataSourceMode() === "provided";
		await this.resultsPanelController.setReadOnly(!useResultsAsSource);
	}
	
	scheduleAutoRender() {
		if (this.isScenarioLoading) return;
		if (this.autoRenderTimer) {
			clearTimeout(this.autoRenderTimer);
		}
		this.autoRenderTimer = setTimeout(() => {
			this.autoRenderTimer = null;
			void this.render();
		}, this.autoRenderDelayMs);
	}
	
	refreshVisualizationTab() {
		const { scenario } = this.demoControl.getActiveContext();
		const component = this.getActiveComponent();
		if (!component) return;
		requestAnimationFrame(() => {
			this.visualizationView.refreshCurrent({ component, scenario });
		});
	}
	
	isCustomWorkspace() {
		return this.workspace.mode === "custom";
	}
	
	getActiveComponent() {
		if (this.workspace.component) return this.workspace.component;
		return this.demoControl.getActiveContext().scenario?.component || null;
	}
	
	getActiveTemplate() {
		return (
			this.getTemplateById(this.workspace.templateId) ||
			this.getTemplateByComponent(this.getActiveComponent())
		);
	}
	
	getTemplateById(id) {
		return VISUALIZATION_TEMPLATES.find((template) => template.id === id) || VISUALIZATION_TEMPLATES[0];
	}
	
	getTemplateByComponent(component) {
		return VISUALIZATION_TEMPLATES.find((template) => template.component === component) || null;
	}
	
	async fetchEncodingForActiveTemplate() {
		return this.fetchTemplateEncoding(this.getActiveTemplate());
	}
	
	async fetchTemplateEncoding(template) {
		if (!template?.encodingPath) return null;
		return fetchJson(template.encodingPath);
	}
	
	getActiveWorkspaceLabel() {
		if (!this.isCustomWorkspace()) {
			const scenario = this.demoControl.getActiveContext().scenario;
			return scenario?.name || scenario?.id || "example";
		}
		
		return `custom ${this.getActiveTemplate()?.label || "chart"}`;
	}
	
	setStatus(message, isError = false) {
		updateStatus(message, { isError });
	}
	
	_buildFileStem(value) {
		return String(value || "venus-visualization")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || "venus-visualization";
	}
	
	async safeRun(action, fallbackMessage) {
		return safeRun(action, { fallbackMessage });
	}
}
