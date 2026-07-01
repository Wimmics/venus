# @wimmics/venus-elements

VENUS is a JavaScript library for creating interactive visualizations and dashboards from SPARQL queries.

The `@wimmics/venus-elements` package provides the web components required to define visualization techniques. Each component accepts either a SPARQL query or a SPARQL JSON result set, together with a declarative JSON encoding. The component retrieves the data using the provided query, transforms the results into the appropriate visualization data structure, and renders the output in the browser.

## Usage

Select the desired visualization technique and add the corresponding web component as a target element in your HTML:

```js
<venus-graph id="vis" width="100%" height="520"></venus-graph>
```

Then configure and launch it from JavaScript:
```js
const graph = document.querySelector("#vis");
          
graph.sparqlEndpoint = "https://dbpedia.org/sparql";

graph.sparqlQuery = "SELECT ?source ?target WHERE { ?source dbo:starring ?target . } LIMIT 30";

graph.encoding = {
  title: "Actors Co-starring Graph",
  interactions: { drag: true, zoom: true }
};

graph.launch();
```

## Documentation
For a full documentation, see [https://wimmics.github.io/venus/](https://wimmics.github.io/venus/)

## Editor
A web-based editor is available to explore the components, test configurations, and directly export VENUS specifications for integration into your application. 

The editor is available at [https://wimmics.github.io/venus/editor](https://wimmics.github.io/venus/editor)
