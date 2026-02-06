import descriptiveTpl from "../queries/meta-descriptive.rq";
import relationshipsTpl from "../queries/meta-relationships.rq";
import technicalTpl from "../queries/meta-technical.rq";

const registry = new Map([
  ["descriptive", descriptiveTpl],
  ["relationships", relationshipsTpl],
  ["technical", technicalTpl]
]);

function assertNonEmptyString(name, v) {
  console.log(name, v)
  if (typeof v !== "string" || v.trim() === "") {
    throw new Error(`${name} must be a non-empty string`);
  }
}

/**
 * Minimal hardening: you typically want a real IRI here.
 * This does not fully prevent SPARQL injection if a caller passes arbitrary text,
 * but it prevents obvious query-breaking characters in the IRI position.
 */
function sanitizeIri(iri) {
  return iri.trim().replace(/[\s<>"]/g, "");
}

function render(template, params) {
  let out = template;

  for (const [key, value] of Object.entries(params)) {
    const token = `{{${key}}}`;
    out = out.split(token).join(String(value));
  }

  // Optional: fail fast if a placeholder remains
  if (out.includes("{{")) {
    throw new Error("Unresolved SPARQL template placeholders remain");
  }
  return out;
}

export function listSparqlQueries() {
  return [...registry.keys()];
}

/**
 * @param {"descriptive"|"relationships"|"technical"} name
 * @param {{ uri: string }} params
 */
export function createMetadataSparqlQuery(name, params) {
  assertNonEmptyString("name", name);

  if (!params || typeof params !== "object") {
    throw new TypeError(
      `createMetadataSparqlQuery(name, params): params must be an object like { uri: "..." }, got ${params}`
    );
  }

  const { uri } = params;
  assertNonEmptyString("uri", uri);

  const tpl = registry.get(name);
  if (!tpl) {
    throw new Error(
      `Unknown query "${name}". Known: ${listSparqlQueries().join(", ")}`
    );
  }

  return render(tpl, { URI: sanitizeIri(uri) });
}

