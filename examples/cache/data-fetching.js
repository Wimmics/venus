import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCENARIOS_INDEX_PATH = path.resolve(__dirname, "../scenarios.index.json");
const CACHE_DIR = __dirname;

function toCacheFilename(scenarioId) {
	return `${scenarioId}.json`;
}

function resolveFromIndex(relPath) {
	return path.resolve(path.dirname(SCENARIOS_INDEX_PATH), String(relPath || ""));
}

async function readScenarioEntries() {
	const indexContent = await fs.readFile(SCENARIOS_INDEX_PATH, "utf8");
	const parsed = JSON.parse(indexContent);
	const scenarios = Array.isArray(parsed?.scenarios) ? parsed.scenarios : [];

	return scenarios;
}

async function runSparqlQuery({ endpoint, queryText }) {
	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/sparql-query",
			Accept: "application/sparql-results+json, application/json",
		},
		body: queryText,
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(
			`Endpoint ${endpoint} returned ${response.status} ${response.statusText}${
				body ? `\n${body}` : ""
			}`
		);
	}

	return response.json();
}

async function saveResultFile(scenarioId, data) {
	const outputPath = path.join(CACHE_DIR, toCacheFilename(scenarioId));
	await fs.writeFile(outputPath, JSON.stringify(data, null, 2), "utf8");
	return outputPath;
}

async function main() {
	console.log(`Scenarios index: ${SCENARIOS_INDEX_PATH}`);
	console.log(`Cache destination folder: ${CACHE_DIR}`);

	await fs.mkdir(CACHE_DIR, { recursive: true });

	const scenarios = await readScenarioEntries();

	if (scenarios.length === 0) {
		console.log("No scenarios found. Nothing to fetch.");
		return;
	}

	console.log(`Found ${scenarios.length} scenario(s).`);

	const failures = [];
	const cacheByRequest = new Map();

	for (const scenario of scenarios) {
		const scenarioId = String(scenario?.id || "").trim();
		const endpoint = String(scenario?.endpoint || "").trim();
		const queryPath = String(scenario?.queryPath || "").trim();

		if (!scenarioId || !endpoint || !queryPath) {
			failures.push({
				scenario: scenarioId || "<missing-id>",
				error: "Missing one of required fields: id, endpoint, queryPath"
			});
			continue;
		}

		const queryAbsolutePath = resolveFromIndex(queryPath);
		process.stdout.write(`Running ${scenarioId} ... `);

		try {
			const queryText = await fs.readFile(queryAbsolutePath, "utf8");
			const requestKey = `${endpoint}\n${queryText}`;

			let result = cacheByRequest.get(requestKey);
			if (!result) {
				result = await runSparqlQuery({ endpoint, queryText });
				cacheByRequest.set(requestKey, result);
			}

			const outputPath = await saveResultFile(scenarioId, result);
			console.log(`OK -> ${path.basename(outputPath)}`);
		} catch (error) {
			console.log("FAILED");
			failures.push({
				scenario: scenarioId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	if (failures.length > 0) {
		console.error(`\n${failures.length} scenario(s) failed:`);
		for (const failure of failures) {
			console.error(`- ${failure.scenario}: ${failure.error}`);
		}
		process.exitCode = 1;
		return;
	}

	console.log("\nAll scenario results were fetched and cached successfully.");
}

main().catch((error) => {
	console.error("Unexpected error while fetching SPARQL data.");
	console.error(error instanceof Error ? error.stack : error);
	process.exitCode = 1;
});
