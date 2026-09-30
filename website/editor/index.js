import "@wimmics/venus";
import { EditorApp } from "./src/js/editor-app.js";
import { UserEvaluation } from "./src/js/userEvaluation/user-evaluation.js";

import { Tutorial } from "./src/js/tutorial/tutorial.js";
import editorTutorial from "./src/js/tutorial/editor-tutorial.js";
import defaultContent from "./src/js/tutorial/content/default.js";

window.addEventListener("DOMContentLoaded", async () => {
	const testingMode =
		new URLSearchParams(window.location.search).get("mode") === "user-study";

	if (import.meta.env.PROD && !testingMode) {
		document.body.innerHTML = `
			<div style="padding: 40px; font-family: sans-serif;">
				<h2>VENUS Editor</h2>
				<p>The editor is currently available only through the user study.</p>
			</div>
		`;
		return;
	}

	const app = new EditorApp();
	await app.init();
	
	const tutorial = new Tutorial({ ui: app, workflow: editorTutorial });
	tutorial.setContent(defaultContent);

	document.querySelector("#guided-tour")
		.addEventListener("click", () => tutorial.start());

	if (testingMode) {
		const usabilityTesting = new UserEvaluation({
			editorApp: app,
			tutorial: tutorial
		});

		usabilityTesting.init();
	}
});
