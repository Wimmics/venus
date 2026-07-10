import "@wimmics/venus";
import { EditorApp } from "./src/js/editor-app.js";
import { UserEvaluation } from "./src/js/userEvaluation/user-evaluation.js";

window.addEventListener("DOMContentLoaded", async () => {
	const app = new EditorApp();
	await app.init();
	
	const testingMode = new URLSearchParams(window.location.search).get("mode") === "testing";
	
	if (testingMode) {
		const usabilityTesting = new UserEvaluation({ editorApp: app })
		usabilityTesting.init()
	}
});
