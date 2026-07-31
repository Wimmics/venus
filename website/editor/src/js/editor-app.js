import {
	WORKSPACE_STORAGE_KEY,

	SCENARIOS_INDEX_PATH,
	SCENARIOS_BASE_PATH,

	TEMPLATES_INDEX_PATH,
	TEMPLATES_BASE_PATH,
	QUERIES_INDEX_PATH,
	QUERIES_BASE_PATH,
} from "./constants.js";


import { SnippetGenerator } from "./snippet-generator.js";
import { VisualizationView } from "./visualization-view.js";

import { SplitViewResizer } from "./split-view-resizer.js";

import { SparqlPanelController } from "./sparql-panel-controller.js";
import { EncodingPanelController } from "./encoding-panel-controller.js";
import { ResultsPanelController } from "./results-panel-controller.js";
import { SnippetPanelController } from "./snippet-panel-controller.js";

import { fetchJson, fetchText } from "./utils/http-utils.js";
import { safeRun, updateStatus } from "./utils/safe-run.js";
import { normalizeComponentTag } from "./utils/component-tag.js";

import * as d3 from "d3"

export class EditorApp {
	constructor() {
		
		this.visualizationTabButton = document.getElementById("visualization-tab");

		this.isScenarioLoading = false;
		this.workspace = {
			mode: "example",
			templateId: null,
			component: null
		};
		
		// Views
		this.snippetGenerator = new SnippetGenerator();
		this.visualizationView = new VisualizationView({
			hostEl: document.getElementById("visualizationHost"),
			metaPanelEl: document.getElementById("metaPanel")
		});
		
		this.splitViewResizer = new SplitViewResizer({
			containerEl: document.getElementById("workspaceRow"),
			panes: {
				config: document.getElementById("configPane"),
				result: document.getElementById("resultPane")
			},
			splitters: {
				dataResult: document.getElementById("splitterDataResult")
			}
		});
		
		// Controllers
		this.sparqlPanelController = new SparqlPanelController({
			getActiveContext: () => this.getActiveContext(),
			onAfterReset: async () => {
				await this.updateGeneratedCode();
				await this.render();
			},
			onToggleResultsAsSource: async () => {
				await this.applyResultsEditorMode();
				this.updateGeneratedCode();
			}
		});
		
		this.encodingPanelController = new EncodingPanelController({
			getActiveContext: () => this.getActiveContext(),
			getActiveComponent: () => this.getActiveComponent(),
			onAfterReset: async () => {
				await this.updateGeneratedCode();
				await this.render();
			},
			onRun: async () => {
				await this.updateGeneratedCode();
				await this.render();
			}
		});
		
		this.resultsPanelController = new ResultsPanelController({
			getActiveContext: () => this.getActiveContext()
		});
		
		this.snippetPanelController = new SnippetPanelController({
			getActiveContext: () => this.getActiveContext()
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

		await this.visualizationView.init()
		
		await this.loadResources()
		await this.setupSelects()

		await this.recoverWorkspace()
	}


	bindEvents() {
		this.visualizationTabButton.addEventListener("shown.bs.tab", () => {
			this.refreshVisualizationTab();
		});
	}

	// --- workspace state ----

	async recoverWorkspace() {
		const storedWorkspace = sessionStorage.getItem(WORKSPACE_STORAGE_KEY)
		
		if (storedWorkspace) {
			this.workspace = JSON.parse(storedWorkspace)
			console.log("recovered workspace = ", this.workspace)

			// retrieve context information
			this.activeScenario = this.workspace.context?.scenario
			this.activeEncoding = this.workspace.context?.encoding
			this.activeQueryText = this.workspace.context?.queryText

			// launch the editor according to what was loaded before refresh
			if (this.workspace.scenarioId && this.activeScenario) { 
				await this.launchWorkspace({scenarioId: this.workspace.scenarioId})
				d3.select("#scenarioSelect").selectAll("option").property("selected", d => d.id === this.workspace.scenarioId)
				return
			}

			if (this.activeQueryText) { 
				//await this.launchWorkspaceFromQuery(this.workspace.queryId)
				this.sparqlPanelController.setText(this.activeQueryText)
				d3.select("#querySelect").selectAll("option").property("selected", d => d.id === this.workspace.queryId)
			}
			
			if (this.activeEncoding) {//await this.launchWorkspaceFromEncoding(this.workspace.templateId)
				this.encodingPanelController.setValue(this.activeEncoding)
				d3.select("#visualizationTypeSelect").selectAll("option").property("selected", d => d.id === this.workspace.templateId)
			}

			return
		}

		this.launchWorkspace({scenarioId: this.scenarioCatalog.defaultId})
	}

	async updateWorkspace({
		queryId = null,
		templateId = null,
		scenarioId = null,
		mode = "custom",
		component = null
	}) {
		let context = this.getActiveContext();

		if (mode === "demo") {
			context = {
				...context,
				queryText: null,
				encoding: null
			};
		}

		this.workspace = {
			mode,
			scenarioId,
			templateId,
			queryId,
			component,
			context
		};

		const selectsToReset = scenarioId ? ["#querySelect", "#visualizationTypeSelect"] : ["#scenarioSelect"];

		selectsToReset.forEach(id =>
			d3.select(id).property("selectedIndex", 0)
		);

		sessionStorage.setItem(
			WORKSPACE_STORAGE_KEY,
			JSON.stringify(this.workspace)
		);
	}

	isCustomWorkspace() {
		return this.workspace.mode === "custom";
	}
	
	getActiveComponent() {
		if (this.workspace.component) return this.workspace.component;
		return this.getActiveContext().scenario?.component || null;
	}

	getActiveContext() {
		return {
			scenario: this.activeScenario,
			queryText: this.activeQueryText || this.activeScenario?.query,
			encoding: this.activeEncoding || this.activeScenario?.encoding 
		};
	}
	
	// --- end workspace state

	async loadCatalog({
		indexPath,
		basePath,
		entriesKey,
		defaultIdKey,
		loadEntry,
		setupSelect
	}) {
		const index = await fetchJson(indexPath);

		const entries = entriesKey
			? (Array.isArray(index[entriesKey]) ? index[entriesKey] : [])
			: (Array.isArray(index) ? index : []);

		const items = (await Promise.all(
			entries.map(entry => loadEntry(entry, basePath))
		)).filter(Boolean);

		const catalog = {
			items,
			defaultId: defaultIdKey ? index[defaultIdKey] : null
		};

		return {
			catalog,
			map: new Map(items.map(item => [item.id, item]))
		};
	}

	async loadResources() {
		const scenarios = await this.loadCatalog({
			indexPath: SCENARIOS_INDEX_PATH,
			basePath: SCENARIOS_BASE_PATH,
			entriesKey: "scenarios",
			defaultIdKey: "defaultScenarioId",

			loadEntry: async (entry, basePath) => {
				if (!entry.encodingPath) return null;

				const encoding = await fetchJson(
					`${basePath}${entry.encodingPath}`
				);

				const query = await fetchText(
					`${basePath}${entry.queryPath}`
				);

				return {
					...entry,
					encoding,
					query,
					cachePath: `${basePath}/cache/${entry.id}.json`,
					component: normalizeComponentTag(entry.component)
				};
			}
		});

		this.scenarioCatalog = scenarios.catalog;
		this.scenarios = scenarios.map;

		const templates = await this.loadCatalog({
			indexPath: TEMPLATES_INDEX_PATH,
			basePath: TEMPLATES_BASE_PATH,
			entriesKey: "templates",
			defaultIdKey: "defaultScenarioId",

			loadEntry: async (entry, basePath) => {
				if (!entry.encodingPath) return null;

				return {
					...entry,
					encoding: await fetchJson(
						`${basePath}${entry.encodingPath}`
					)
				};
			}
		});

		this.templateCatalog = templates.catalog;
		this.templates = templates.map;

		const queries = await this.loadCatalog({
			indexPath: QUERIES_INDEX_PATH,
			basePath: QUERIES_BASE_PATH,

			loadEntry: async (entry, basePath) => {
				if (!entry.queryPath) return null;

				const queryPath = `${basePath}${entry.queryPath}`;

				return {
					...entry,
					queryPath,
					query: await fetchText(queryPath)
				};
			}
		});

		this.queryCatalog = queries.catalog;
		this.queries = queries.map;
	}

	async setupSelect({
		selectId,
		catalog,
		placeholder,
		workspaceKey
	}) {
		const options = [
			{ id: "", label: placeholder },
			...catalog.items
		];

		console.log("options = ", options)

		const select = d3.select(selectId)
			.property("selectedIndex", 0)
			.on("change", (event) => {
				this.launchWorkspace({
					[workspaceKey]: event.target.value
				});
			});

		select.selectAll("option")
			.data(options)
			.join("option")
			.attr("value", d => d.id)
			.text(d => d.label ?? d.name)
			.property("disabled", (_, i) => i === 0)
			.property("selected", (_, i) => i === 0);
	}

	async setupSelects() {
		await this.setupSelect({
			selectId: "#scenarioSelect",
			catalog: this.scenarioCatalog,
			placeholder: "Choose an example...",
			workspaceKey: "scenarioId"
		});

		await this.setupSelect({
			selectId: "#visualizationTypeSelect",
			catalog: this.templateCatalog,
			placeholder: "Choose a template...",
			workspaceKey: "templateId"
		});

		await this.setupSelect({
			selectId: "#querySelect",
			catalog: this.queryCatalog,
			placeholder: "Choose a query...",
			workspaceKey: "queryId"
		});
	}


	// --- workspace rendering ----

	async loadSelectedScenario(scenarioId = null) {
		const scenario = this.scenarios.get(scenarioId);
		if (!scenario) {
			throw new Error(`Unknown scenario: ${scenarioId}`);
		}

		const cachedSparqlResult = scenario.cachePath ? await fetchJson(scenario.cachePath, { optional: true }) : null;
		const hasCachedResult = cachedSparqlResult != null;

		this.activeScenario = {
			...scenario,
			sparqlResult: cachedSparqlResult,
			hasCachedResult,
			dataSource: hasCachedResult ? "provided" : "query"
		};
		sessionStorage.setItem(this.storageKey, scenario.id);
		
		return this.activeScenario;
	}

	async launchWorkspace({
		queryId = null,
		templateId = null,
		scenarioId = null
	} = {}) {
		this.isScenarioLoading = true;

		try {
			await safeRun(async () => {
				// Load query
				if (queryId) {
					const query = this.queries.get(queryId);
					if (!query) return;

					this.activeQueryText = query.query;

					await this.updateWorkspace({ queryId });
					await this.sparqlPanelController.toggleResultsAsSource(false);
					await this.applyResultsEditorMode();
					await this.sparqlPanelController.setText(this.activeQueryText);
				}

				// Load encoding template
				if (templateId) {
					const template = this.templates.get(templateId);
					if (!template) return;

					this.activeEncoding = template.encoding;

					await this.updateWorkspace({
						templateId,
						component: template.component
					});

					await this.encodingPanelController.setValue(this.activeEncoding);
				}

				// Load full scenario
				if (scenarioId) {
					const scenario = await this.loadSelectedScenario(scenarioId);

					await this.updateWorkspace({
						scenarioId,
						component: scenario.component,
						mode: "demo"
					});

					await this.applyResultsEditorMode();
					await this.sparqlPanelController.setEndpoint(scenario.endpoint);
					await this.sparqlPanelController.setText(scenario.query || "");
					await this.encodingPanelController.setValue(scenario.encoding || {});
					await this.resultsPanelController.setText(
						JSON.stringify(
							scenario.sparqlResult || scenario.results || {},
							null,
							2
						)
					);
				}

				await this.updateGeneratedCode()

				if (scenarioId) await this.render()
				else this.visualizationView.clear()

			}, "Failed to launch workspace.");
		} finally {
			this.isScenarioLoading = false;
		}
	}
	
	async render() {
		await safeRun(async () => {
			const parsedEncoding = await this.encodingPanelController.parseValue();
			if (parsedEncoding.error) {
				updateStatus(parsedEncoding.error.message, {isError: true} );
				return;
			}
			
			const { scenario } = this.getActiveContext();
			const component = this.getActiveComponent();
			if (!component) return
			
			const endpoint = this.isCustomWorkspace() ? "" : scenario?.endpoint
			const dataSource = this.sparqlPanelController.getDataSourceMode();
			const canUseScenarioCache =
				!this.isCustomWorkspace() &&
				dataSource === "query" &&
				scenario?.hasCachedResult === true;
			const renderDataSource = canUseScenarioCache ? "provided" : dataSource;
			const queryText = await this.sparqlPanelController.getText();
			if (renderDataSource === "query" && !String(queryText || "").trim()) {
				updateStatus("Enter a SPARQL query to render the selected chart.", {isError: true});
				return;
			}
			
			let providedSparqlResult = null;
			if (renderDataSource === "provided") {
				if (canUseScenarioCache) {
					providedSparqlResult = scenario.sparqlResult;
				} else {
					const parsedResults = await this.resultsPanelController.parseJson();
					if (parsedResults.error) {
						updateStatus(`Invalid SPARQL Results JSON: ${parsedResults.error.message}`, {isError: true});
						return;
					}
					providedSparqlResult = parsedResults.value;
				}
			}
			
			try {
				const result = await this.visualizationView.render({
					component,
					scenario,
					endpoint,
					queryText,
					encoding: parsedEncoding.value,
					dataSource: renderDataSource,
					sparqlResult: providedSparqlResult
				});

				if (result?.sparqlData) {
					await this.resultsPanelController.setText(JSON.stringify(result.sparqlData || {}, null, 2));
				}
			} catch(e) {
				updateStatus(e.message, {isError: true})
			}
			
			await this.updateGeneratedCode();
		},
		"Render failed")
	}
	
	async updateGeneratedCode() {
		const parsedEncoding = await this.encodingPanelController.parseValue();
		const { scenario } = this.getActiveContext();
		const component = this.getActiveComponent();
		if (!component || parsedEncoding.error) {
			await this.snippetPanelController.setText("// Invalid or missing configuration");
			return;
		}
		
		const dataSource = this.sparqlPanelController.getDataSourceMode();
		const endpoint = this.isCustomWorkspace() ? "" : scenario?.endpoint
		const queryText = await this.sparqlPanelController.getText();
		const parsedResults = dataSource === "provided" ? await this.resultsPanelController.parseJson() : { value: null, error: null };
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
	
	async applyResultsEditorMode() {
		const useResultsAsSource = this.sparqlPanelController.getDataSourceMode() === "provided";
		await this.resultsPanelController.setReadOnly(!useResultsAsSource);
	}
	
	refreshVisualizationTab() {
		const { scenario } = this.getActiveContext();
		const component = this.getActiveComponent();
		if (!component) return;
		requestAnimationFrame(() => {
			this.visualizationView.refreshCurrent({ component, scenario });
		});
	}
	
}
