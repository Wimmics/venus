# @wimmics/venus

VENUS is a JavaScript library for creating interactive visualizations and dashboards from SPARQL queries.

The `@wimmics/venus` package provides five web components for different visualization techniques. Each component accepts either a SPARQL query or a SPARQL JSON result set, together with a declarative JSON encoding specification. The component retrieves the data, transforms it into visualization-specific structures, and renders the output as interactive SVG visualizations.

## Visualization Types

| Component | Purpose | Use Case |
|-----------|---------|----------|
| `<venus-graph>` | Force-directed node-link diagram | Entity relationships, co-occurrence networks |
| `<venus-barchart>` | Grouped/stacked bar chart | Categorical comparisons, multi-series data |
| `<venus-linechart>` | Multi-series line chart | Time series, trends, continuous data |
| `<venus-scatterplot>` | 2D point scatter plot | Correlation analysis, bivariate distributions |
| `<venus-sankey>` | Flow/Sankey diagram | Flow visualization, hierarchical transitions |

## Installation

```bash
npm install @wimmics/venus
```

## Quick Start

### Add a Component to HTML

```html
<venus-graph id="graph" width="100%" height="600px"></venus-graph>
```

### Configure and Launch (Property API)

```js
const graph = document.querySelector("#graph");

graph.sparqlEndpoint = "https://dbpedia.org/sparql";
graph.sparqlQuery = "SELECT ?source ?target WHERE { ?source dbo:starring ?target } LIMIT 30";

graph.encoding = {
  nodes: { 
    color: { value: "#666" },
    label: { field: "source" }
  },
  links: { color: { value: "#999" } },
  interactions: { drag: true, zoom: true }
};

await graph.launch();
```

### Attribute API (HTML)

Alternatively, configure using HTML attributes with JSON strings:

```html
<venus-graph
  sparqlEndpoint="https://dbpedia.org/sparql"
  sparqlQuery='SELECT ?category ?value { ... }'
  encoding='{"bars": {"x": {"field": "category"}, "y": {"field": "value"}}}'
  width="800"
  height="600"
></venus-graph>

<script>
  document.querySelector("venus-graph").launch();
</script>
```

### Using Pre-Computed Results

```js
const graph = document.querySelector("#graph");

graph.sparqlResult = {
  head: { vars: ['source', 'target', 'weight'] },
  results: { bindings: [ ... ] }
};

graph.encoding = { ... };
await graph.launch();
```

## Encoding Specifications

Each visualization type has its own encoding schema for mapping data to visual properties:

```js
// Bar chart example
graph.encoding = {
  bars: {
    x: { field: 'category' },
    y: { field: 'value' },
    color: { field: 'region', scale: { type: 'ordinal', range: 'Set2' } }
  },
  interactions: { tooltip: true }
};

// Graph example
graph.encoding = {
  nodes: { 
    color: { field: 'type', scale: { type: 'ordinal', range: 'Set3' } },
    size: { field: 'degree', scale: { type: 'sqrt', range: [5, 30] } }
  },
  links: { color: { value: '#999' } },
  interactions: { drag: true, zoom: true, tooltip: true }
};
```

See [@wimmics/venus-encoding](../encoding) for complete encoding specifications.

## API Reference

### Properties

- **`sparqlEndpoint`** (string): SPARQL endpoint URL for query execution
- **`sparqlQuery`** (string): SPARQL SELECT query to fetch data
- **`sparqlResult`** (object): Pre-computed SPARQL JSON result (alternative to endpoint + query)
- **`encoding`** (object): Visual encoding specification (defines how data maps to visuals)
- **`proxy`** (string): Optional CORS proxy URL for endpoints that don't support CORS
- **`width`** (number|string): Component width (e.g., 800, "100%")
- **`height`** (number|string): Component height (e.g., 600, "100%")
- **`resize`** (boolean): Enable responsive resizing on window resize (default: true)

### Methods

- **`launch()`**: Fetches data and renders the visualization (async)
- **`setEncoding(spec)`**: Updates visual encoding and re-renders
- **`getEncoding()`**: Returns the current merged encoding with defaults applied

## Documentation

- **Full Documentation**: [https://wimmics.github.io/venus/](https://wimmics.github.io/venus/)
- **Editor**: [https://wimmics.github.io/venus/editor](https://wimmics.github.io/venus/editor) - Test configurations interactively
- **Component Source**: [src/](src/)

## Related Packages

This package is the web component layer. For lower-level APIs:

- [@wimmics/venus-encoding](../encoding) - Encoding specification and validation
- [@wimmics/venus-rendering](../rendering) - SVG rendering engines
- [@wimmics/venus-transform](../transform) - SPARQL data transformation
- [@wimmics/venus-visual-mapping](../visual-mapping) - Visual artifacts and legends
- [@wimmics/venus-import](../import) - Data fetching and orchestration
- [@wimmics/venus-core](../core) - Shared types and utilities

## License

See LICENSE in the repository root.
