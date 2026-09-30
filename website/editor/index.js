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
			<div class="study-page">
				<div class="study-card">
					<p class="study-notice">
						<strong>Sorry!</strong> The VENUS editor is currently available only through the user study.
					</p>

					<div class="study-badge">VENUS User Study</div>

					<h1>Help us evaluate VENUS</h1>

					<p>
						If you work with <strong>knowledge graphs</strong> and
						<strong>SPARQL queries</strong>, we would like your help evaluating
						VENUS for creating visualizations from knowledge graph data.
					</p>

					<p>
						The study takes approximately <strong>45 minutes</strong> and
						involves completing a series of visualization tasks using the VENUS editor.
					</p>

					<a class="study-button" href="?mode=user-study">
						Participate in the user study
					</a>

					<p class="study-note">
						No installation is required. The study runs directly in your browser.
					</p>
				</div>
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
