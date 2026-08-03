import "@wimmics/venus";
import { EditorApp } from "./src/js/editor-app.js";
import { UserEvaluation } from "./src/js/userEvaluation/user-evaluation.js";

import { Tutorial } from "./src/js/tutorial/tutorial.js";
import editorTutorial from "./src/js/tutorial/editor-tutorial.js";
import defaultContent from "./src/js/tutorial/content/default.js";
import usabilityContent from "./src/js/tutorial/content/usability.js";

window.addEventListener("DOMContentLoaded", async () => {
	const app = new EditorApp();
	await app.init();
	
	const testingMode = new URLSearchParams(window.location.search).get("mode") === "testing";
	
	const tutorial = new Tutorial({ ui: app })

	if (testingMode) {
		const usabilityTesting = new UserEvaluation({ editorApp: app })
		usabilityTesting.init()

		tutorial.setContent(usabilityContent)
		tutorial.setMandatory(true)
	} else {
		tutorial.setContent(defaultContent)
		//tutorial.start(editorTutorial, "encoding-toolbar")
	}

	document.querySelector("#guided-tour").addEventListener("click", () => tutorial.start(editorTutorial))
});
