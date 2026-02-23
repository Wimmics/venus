import "@wimmics/venus-webcomponents";

const graph = document.querySelector("#graph");

graph.sparqlEndpoint = "https://dbpedia.org/sparql";
graph.sparqlQuery = `
  SELECT ?source ?target WHERE {
    ?source dbo:starring ?target .
  } LIMIT 30
`;
graph.encoding = {
  nodes: { field: "source" },
  links: { field: "target" },
  color: { field: "source" }
};

await graph.launch();
