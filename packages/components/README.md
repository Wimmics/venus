# @wimmics/venus-webcomponents

Browser-facing Web Components for KG visualization and node metadata.

## Responsibilities
- Provide `<vis-graph>` for graph loading, rendering, encoding, and interaction.
- Provide `<vis-barchart>` for bar-chart loading, rendering, encoding, and legends.
- Include an internal `<vis-uri-meta>` module used by `<vis-graph>` when node details panel is enabled.
- Coordinate datasource, mapper, encoding manager, renderer, and legends.

## Common Attributes (`<vis-graph>`, `<vis-barchart>`)
- `width`: component width. Accepts numeric values (`"800"` -> `800px`) or CSS dimensions (`"100%"`, `"70vw"`).
- `height`: component height. Accepts numeric values (`"600"` -> `600px`) or CSS dimensions (`"100%"`, `"60vh"`).
- `resize`: enables/disables responsive re-rendering on container/window size changes.
  - Default: enabled.
  - Disable with `resize="false"` (also `0`, `no`, `off`).

Example:

```html
<vis-graph
  width="100%"
  height="420"
  resize="true"
></vis-graph>

<vis-barchart
  width="900"
  height="500"
  resize="false"
></vis-barchart>
```

Note:
- When using percentage sizes like `height="100%"`, parent containers must have explicit height for the component to have measurable space.

## Common Properties (`<vis-graph>`, `<vis-barchart>`)
- `sparqlQuery`: SPARQL query string.
- `sparqlEndpoint`: SPARQL endpoint URL. Defaults to `https://dbpedia.org/sparql` if not provided.
- `sparqlResult`: pre-fetched SPARQL JSON result (bypasses endpoint+query fetch).
- `encoding`: visualization encoding object (passed to `@wimmics/venus-encoding`).
- `proxy`: proxy URL for SPARQL requests.

Example:

```js
const chart = document.querySelector("vis-barchart");
chart.sparqlEndpoint = "https://dbpedia.org/sparql";
chart.sparqlQuery = "SELECT ?x ?y WHERE { ... } LIMIT 50";
chart.proxy = "http://localhost:3030/proxy";
chart.encoding = { title: "My Chart" };
chart.launch();
```

## Graph-only Behavior (`<vis-graph>`)
- Node details panel is managed internally by `<vis-graph>` as a `<vis-uri-meta>` instance.
- Enable/disable it with encoding option `interactions.nodeDetailsPanel` (`false` by default).
- The panel lifecycle is owned by `<vis-graph>` and ends when the graph component is destroyed.

## Public Exports
- `VisGraph`
- `VisBarChart`
- `VisBase`

## Internal Module
- `vis-uri-meta` (`VisURIMeta`) is internal to this package and is not part of the public export surface.

## Package Links
- Depends on:
  - `@wimmics/venus-core`
  - `@wimmics/venus-datasource`
  - `@wimmics/venus-encoding`
  - `@wimmics/venus-mappers`
  - `@wimmics/venus-d3renderer`
  - `@wimmics/venus-sparql`
  - `@wimmics/venus-legends`
- Used by:
  - `apps/editor`
  - External browser apps integrating Venus components.
