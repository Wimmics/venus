export class SnippetGenerator {
  generate({ visType, endpoint, queryText, encoding }) {
    const tag = visType === "bar-chart" ? "vis-barchart" : "vis-graph";
    const varName = visType === "bar-chart" ? "barChart" : "graph";
    const escapedQuery = String(queryText || "").replace(/`/g, "\\`");
    const prettyEncoding = JSON.stringify(encoding, null, 2);

    return [
      '<script type="module">',
      '  import "@wimmics/kgnovis-webcomponents";',
      "",
      `  const ${varName} = document.querySelector("${tag}");`,
      `  ${varName}.sparqlEndpoint = "${endpoint}";`,
      `  ${varName}.sparqlQuery = \`${escapedQuery}\`;`,
      `  ${varName}.encoding = ${prettyEncoding};`,
      `  await ${varName}.launch();`,
      "</script>",
      "",
      `<${tag}></${tag}>`
    ].join("\n");
  }
}
