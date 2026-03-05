# Visualization Components

The VENUS architecture is based on Web Components, which encapsulate each visualization technique within a dedicated custom element (e.g., `venus-graph`, `venus-barchart`, `venus-map`). Each component manages its own data pipeline and isolates its logic and rendering behavior.

A component can be instantiated in an HTML page as follows:

```html
<venus-graph id="graph" width="100%" height="520"></venus-graph>
<venus-barchart id="bar" width="100%" height="500"></venus-barchart>
<venus-linechart id="line" width="100%" height="500"></venus-linechart>
<venus-scatterplot id="scatter" width="100%" height="500"></venus-scatterplot>
```

## Shared Attributes

Each component supports standard HTML attributes such as `id`, `width`, `height`, as well as an additional `resize` attribute to improve visualization portability.

| Attribute | Type | Values | Impact |
|---|---|---|---|
| `width` | number or string | CSS size (e.g. `500px`, `100%`, `90vw`) or any number | Controls component width. |
| `height` | number or string | CSS size (e.g. `500px`, `100%`, `90vh`) or any number | Controls component height. |
| `resize` | boolean | `true` / `false` | Auto-resize behavior on container/window changes. |

## Shared Properties

All components expose the following properties to configure data access and visual encoding.

| Property | Type | Values | Impact |
|---|---|---|---|
| `sparqlQuery` | string | SELECT | SPARQL query used to retrieve data from the knowledge graph. |
| `sparqlEndpoint` | string | URL | SPARQL endpoint hosting the knowledge graph, used to fetch data. |
| `sparqlResult` | object | SPARQL JSON Results | Precomputed SPARQL query results used in place of executing a query. |
| `proxy` | string | URL | Routes SPARQL requests through a proxy. See [`proxy`](../data/proxy.md) for details. |
| `encoding` | object | see [`encoding`](../encoding/start.md) | Defines the visual mappings and styling. |



## Public Methods

| Method | Function |
|---|---|
| `launch()` | Builds and renders the visualization with the component's current properties (`sparqlEndpoint`, `sparqlQuery`/`sparqlResult`, `encoding`, `proxy`). Call it after setting or changing data-related inputs. |
| `setEncoding(encodingObject)` | Applies a new encoding object programmatically and rerenders. Use this to update mappings (color, scale, axes, legends, interactions) without recreating the component.
| `getEncoding()` | Returns the currently active resolved encoding object. Useful for debugging and for syncing settings with external controls.

## Typical Flow

1. Create component element.
2. Set `sparqlEndpoint` + `sparqlQuery` or provide `sparqlResult`.
3. Set `encoding`.
4. Call `launch()`.
