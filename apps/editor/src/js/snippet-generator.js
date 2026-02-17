import { toComponentVarName } from "./utils/component-tag.js";

export class SnippetGenerator {
  generate({ component, endpoint, queryText, encoding, dataSource = "query", sparqlResult = null }) {
    const tag = component || "vis-graph";
    const varName = toComponentVarName(tag);
    const prettyEncoding = JSON.stringify(encoding, null, 2);
    const lines = [
      '<script type="module">',
      '  import "@wimmics/venus-webcomponents";',
      "",
      `  const ${varName} = document.querySelector("${tag}");`,
      `  ${varName}.sparqlEndpoint = "${endpoint}";`
    ];

    if (dataSource === "provided") {
      const prettyResult = JSON.stringify(sparqlResult || {}, null, 2);
      lines.push(`  ${varName}.sparqlResult = ${prettyResult};`);
    } else {
      const escapedQuery = String(queryText || "").replace(/`/g, "\\`");
      lines.push(`  ${varName}.sparqlQuery = \`${escapedQuery}\`;`);
    }

    lines.push(`  ${varName}.encoding = ${prettyEncoding};`);
    lines.push(`  await ${varName}.launch();`);
    lines.push("</script>");
    lines.push("");
    lines.push(`<${tag}></${tag}>`);

    return lines.join("\n");
  }
}
