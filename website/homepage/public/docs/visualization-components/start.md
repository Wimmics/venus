# VENUS Overview

VENUS is a declarative visualization library for creating interactive charts and knowledge graph visualizations from SPARQL query results. It currently supports two categories of visualization techniques, summarized in the table below.

| Category | Description | Techniques |
|---|---|
| [Network-based](../visualization-components/network/start.md) | Used to represent relationships and flows among entities. | [Node-link Diagram](./network/venus-graph.md)<br> [Sankey Diagram](./network/venus-sankey.md) |
| [Cartesian](../visualization-components/cartesian/start.md) | Used to emphasize magnitude, ordering, and variation across dimensions. | [Bar Chart, Stacked Bar Chart, Grouped Bar Chart](./cartesian/venus-barchart.md)<br> [Line Chart, Multi-line Chart](./cartesian/venus-linechart.md) <br> [Scatter Plot, Bubble Plot](./cartesian/venus-scatterplot.md) |

Do not know what technique to use? Check the [Visualization Catalogue](https://datavizcatalogue.com/search.html) by Severino Ribecca.

## Web Components Architecture 

The VENUS architecture is based on [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components), which encapsulate each visualization technique within a dedicated custom element, responsible for managing its own data pipeline, while isolating logic and rendering behavior.

A component can be instantiated in an HTML page as follows:

```html
<venus-graph id="graph" width="100%" height="520"></venus-graph>
<venus-sankey id="sankey" width="100%" height="520"></venus-sankey>
<venus-barchart id="bar" width="100%" height="500"></venus-barchart>
<venus-linechart id="line" width="100%" height="500"></venus-linechart>
<venus-scatterplot id="scatter" width="100%" height="500"></venus-scatterplot>
```

## Configuration Approaches

VENUS components support two complementary approaches to configure data and encoding:

### 1. Property-Based API (Recommended for Complex Data)

Set properties via JavaScript after selecting the element. This is the most flexible approach for interactive applications:

```js
const graph = document.querySelector('venus-graph');
graph.sparqlEndpoint = 'https://dbpedia.org/sparql';
graph.sparqlQuery = 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10';
graph.encoding = { nodes: {...}, links: {...} };
graph.launch();
```

**Advantages:** Clean API, full control, complex objects are easier to define, preferred for dynamic configurations.

### 2. Attribute-Based API (Recommended for Static HTML)

Configure components directly in HTML using attributes. This approach follows web component conventions and works well with server-side rendering:

```html
<venus-graph 
  width="100%" 
  height="520"
  sparqlQuery="SELECT ?s ?p ?o WHERE { ... }"
  sparqlEndpoint="https://dbpedia.org/sparql"
  encoding='{"nodes":{...},"links":{...}}'></venus-graph>
```

**Advantages:** Declarative HTML, suitable for static pages and server-side rendering, follows web standards.

### 3. Hybrid Approach

Combine both approaches for maximum flexibility:

```html
<venus-graph id="graph" width="100%" height="520" sparqlEndpoint="https://dbpedia.org/sparql"></venus-graph>
<script>
  document.getElementById('graph').sparqlQuery = userDefinedQuery;
  document.getElementById('graph').launch();
</script>
```

## Attributes

Each component supports standard HTML attributes as well as data configuration attributes. Attributes provide a declarative way to configure components in HTML.

| Attribute | Type | Values | Impact |
|---|---|---|---|
| **Layout** | | | |
| `width` | number or string | CSS size (e.g. `500px`, `100%`, `90vw`) or number | Controls component width. |
| `height` | number or string | CSS size (e.g. `500px`, `100%`, `90vh`) or number | Controls component height. |
| `resize` | boolean | `true` / `false` | Auto-resize behavior on container/window changes. |
| **Data Configuration** | | | |
| `sparqlQuery` | string | SPARQL SELECT query | SPARQL query to retrieve data from the knowledge graph. |
| `sparqlEndpoint` | string | URL | SPARQL endpoint URL for data fetching. |
| `sparqlResult` | string | Valid JSON string | Precomputed SPARQL results as JSON (must be valid JSON string in HTML). |
| `proxy` | string | URL | Routes SPARQL requests through a proxy server. See [`proxy`](../data/proxy.md). |
| `encoding` | string | Valid JSON string | Visual encoding configuration as JSON string. See [`encoding`](../encoding/start.md). |

**Note:** Complex objects like `encoding` must be passed as valid JSON strings in HTML attributes. Special characters in JSON must be properly escaped.

## Properties

All components expose the following properties to configure data access and visual encoding. These can be set programmatically via JavaScript or declaratively via HTML attributes.

| Property | Type | Values | Impact |
|---|---|---|---|
| `sparqlQuery` | string | SELECT | SPARQL query used to retrieve data from the knowledge graph. Can also be set via `sparqlQuery` attribute. |
| `sparqlEndpoint` | string | URL | SPARQL endpoint hosting the knowledge graph. Can also be set via `sparqlEndpoint` attribute. |
| `sparqlResult` | object | SPARQL JSON Results | Precomputed SPARQL query results used in place of executing a query. Can also be set via `sparqlResult` attribute (as JSON string). |
| `proxy` | string | URL | Routes SPARQL requests through a proxy. See [`proxy`](../data/proxy.md). Can also be set via `proxy` attribute. |
| `encoding` | object | see [`encoding`](../encoding/start.md) | Defines the visual mappings and styling. Can also be set via `encoding` attribute (as JSON string). |

## Public Methods

| Method | Function |
|---|---|
| `launch()` | Builds and renders the visualization with the component's current properties (`sparqlEndpoint`, `sparqlQuery`/`sparqlResult`, `encoding`, `proxy`). Call it after setting or changing data-related inputs. |
| `setEncoding(encodingObject)` | Applies a new encoding object programmatically and rerenders. Use this to update mappings (color, scale, axes, legends, interactions) without recreating the component.
| `getEncoding()` | Returns the currently active resolved encoding object. Useful for debugging and for syncing settings with external controls.

## Typical Flow

### Property-Based Flow
1. Create and select component HTML element.
2. Set `sparqlEndpoint` + `sparqlQuery` (or `sparqlResult`).
3. Set `encoding`.
4. Call `launch()`.

### Attribute-Based Flow
1. Create component in HTML with `sparqlEndpoint`, `sparqlQuery`, and `encoding` attributes.
2. Component is ready immediately upon connection (no `launch()` call needed unless data changes).
3. Optionally update via properties and call `launch()` to refresh.


