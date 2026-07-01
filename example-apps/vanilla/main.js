import "@wimmics/venus";

const graph = document.querySelector("#graph");

graph.sparqlEndpoint = "https://dbpedia.org/sparql";
graph.sparqlQuery = `
  SELECT ?source ?target WHERE {
    ?source dbo:starring ?target .
  } LIMIT 30
`;
graph.encoding = {
  nodes: {
    source: { field: "source" },
    target: { field: "target" },
    color: { field: "source" }
  },
  links: { type: "directional" }
};

await graph.launch();
