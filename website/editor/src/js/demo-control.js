import { fetchJson, fetchText } from "./utils/http-utils.js";
import { resolvePath } from "./utils/path-utils.js";
import { normalizeComponentTag } from "./utils/component-tag.js";

export class DemoControl {
	constructor({ selectEl, storageKey, indexPath }) {
		this.selectEl = selectEl;
		this.storageKey = storageKey;
		this.indexPath = indexPath;
		this.catalog = null;
		this.scenarioById = new Map();
		this.activeScenario = null;
		this.activeQueryText = "";
	}
	
	async init() {
		await this.loadCatalog();
		this.populateSelect();
		await this.loadSelectedScenario();
	}
	
	hasScenarios() {
		return Boolean(this.catalog?.scenarios?.length);
	}
	
	getActiveContext() {
		return {
			scenario: this.activeScenario,
			queryText: this.activeQueryText
		};
	}
	
	async loadCatalog() {
		const index = await fetchJson(this.indexPath);
		const entries = Array.isArray(index.scenarios) ? index.scenarios : [];
		
		const scenarios = await Promise.all(
			entries.map(async (entry) => {
				if (entry.encodingPath) {
					const encodingPath = resolvePath(this.indexPath, entry.encodingPath);
					const encoding = await fetchJson(encodingPath);
					const queryPath = resolvePath(this.indexPath, entry.queryPath || "");
					
					return {
						...entry,
						id: entry.id,
						encodingPath,
						queryPath,
						encoding,
						component: normalizeComponentTag(entry.component || "venus-graph")
					};
				}
				
				// Backward-compatible path for legacy catalogs using configPath.
				const configPath = resolvePath(this.indexPath, entry.configPath);
				const config = await fetchJson(configPath);
				const queryPath = resolvePath(configPath, config.queryPath);
				
				return {
					...entry,
					id: entry.id,
					configPath,
					...config,
					queryPath,
					component: normalizeComponentTag(entry.component || config.component || "venus-graph")
				};
			})
		);
		
		this.catalog = {
			defaultScenarioId: index.defaultScenarioId,
			scenarios
		};
		this.scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
	}
	
	populateSelect() {
		this.selectEl.innerHTML = "";
		
		for (const scenario of this.catalog.scenarios) {
			const option = document.createElement("option");
			option.value = scenario.id;
			option.textContent = scenario.name || scenario.id;
			this.selectEl.appendChild(option);
		}
		
		const saved = sessionStorage.getItem(this.storageKey);
		const hasSaved = this.catalog.scenarios.some((scenario) => scenario.id === saved);
		const hasDefault = this.catalog.scenarios.some(
			(scenario) => scenario.id === this.catalog.defaultScenarioId
		);
		
		const selectedId = hasSaved
		? saved
		: hasDefault
		? this.catalog.defaultScenarioId
		: this.catalog.scenarios[0]?.id;
		
		if (selectedId) {
			this.selectEl.value = selectedId;
			sessionStorage.setItem(this.storageKey, selectedId);
		}
	}
	
	async loadSelectedScenario() {
		const scenario = this.scenarioById.get(this.selectEl.value);
		if (!scenario) {
			throw new Error(`Unknown scenario: ${this.selectEl.value}`);
		}
		
		this.activeScenario = scenario;
		this.activeQueryText = await fetchText(scenario.queryPath);
		sessionStorage.setItem(this.storageKey, scenario.id);
		
		return scenario;
	}
}
