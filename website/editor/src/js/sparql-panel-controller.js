import { CodeViewer } from "./code-viewer.js";
import { EditorPanelController } from "./editor-panel-controller.js";
import { safeRun, updateStatus } from "./utils/safe-run.js";

export class SparqlPanelController extends EditorPanelController {
	constructor({
		getActiveContext,
		onContentChanged,
		onAfterReset,
		onToggleResultsAsSource,
		statusSelector = "#status"
	}) {
		super({ getActiveContext, onContentChanged, onAfterReset, statusSelector });
		this.editor = new CodeViewer({
			holderId: "sparqlEditor",
			language: "sparql",
			readOnly: false
		});
		
		this.resultsAsSourceToggleEl = document.querySelector("#resultsAsSourceToggle")
		this.resultsAsSourceToggleEl.checked = false
		this.resultsAsSourceToggleEl.addEventListener("change", () => onToggleResultsAsSource())    
	}
	
	getToolbarActions() {
		return [
			...super.getToolbarActions(),
			{
				id: "sparql-reset",
				title: "Reload base SPARQL query from demo",
				iconClass: "bi bi-arrow-counterclockwise",
				onClick: async () => this.reset()
			}
		];
	}
	
	async reset() {
		await safeRun(async () => {
			
			const { queryText } = this.getActiveContext?.()
			
			if (!queryText) {
				updateStatus("Select a query or an example first.", { isError: true })
				return
			}

			await this.setText(queryText);

			if (this.onAfterReset) await this.onAfterReset({ target: "query" });
			
		},
		{ fallbackMessage: this.getResetFailureMessage(), statusSelector: this.statusSelector })
	}
	
	async setEndpoint(endpoint) {
		document.querySelector("#endpointInput").value = endpoint || ""
	}
	
	async toggleResultsAsSource(value) {
		this.resultsAsSourceToggleEl.checked = value
	}
	
	getDataSourceMode() {
		return this.resultsAsSourceToggleEl.checked ? "provided" : "query";
	}
	
	
	
	getToolbarHolderId() {
		return "sparqlToolbar";
	}
	
	getFallbackStem() {
		return "query";
	}
	
	getFileExtension() {
		return "rq";
	}
	
	getMimeType() {
		return "application/sparql-query";
	}
	
	getCopyTitle() {
		return "Copy SPARQL query";
	}
	
	getDownloadTitle() {
		return "Download SPARQL query";
	}
	
	getCopySuccessMessage() {
		return "SPARQL query copied to clipboard";
	}
	
	getCopyFailureMessage() {
		return "Failed to copy SPARQL query";
	}
	
	getDownloadFailureMessage() {
		return "Failed to download SPARQL query";
	}
	
	getResetFailureMessage() {
		return "Failed to restore base SPARQL query";
	}
}
