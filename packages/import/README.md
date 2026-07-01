# @wimmics/venus-import

Orchestration layer for data fetching and visualization building.

Provides high-level functions for fetching SPARQL data and building complete visualization structures. This is the primary entry point for web components and applications that need to load data from SPARQL endpoints.

## Responsibilities

- **Data Fetching**: Executes SPARQL queries against endpoints with retry support
- **Error Handling**: Handles network errors, CORS issues, malformed responses
- **Proxy Support**: Forwards requests through optional CORS proxy
- **Data Orchestration**: Coordinates data fetching → transformation → artifact compilation
- **Caching**: Optional result caching to reduce redundant queries

## Installation

```bash
npm install @wimmics/venus-import
```

## Quick Start

### Fetching Data

```js
import { fetchVisData } from '@wimmics/venus-import';

const result = await fetchVisData({
  endpoint: 'https://dbpedia.org/sparql',
  query: 'SELECT ?source ?target WHERE { ?source dbo:starring ?target } LIMIT 30',
  proxyUrl: null  // Optional CORS proxy
});

if (result.status === 'success') {
  const sparqlResults = result.raw;
  console.log(sparqlResults.head.vars);
  console.log(sparqlResults.results.bindings.length);
} else {
  console.error('Fetch failed:', result.message);
}
```

### Building Visualizations (Advanced)

```js
import { buildVis } from '@wimmics/venus-import';

const vizData = await buildVis({
  visType: 'VENUS_GRAPH',
  endpoint: 'https://dbpedia.org/sparql',
  query: sparqlQuery,
  encoding: graphEncoding
});

// Returns: { graph: { nodes, links }, meta: { ... } }
```

## Visualization Builders

Builders coordinate the complete pipeline for specific visualization types:

| Visualization | Builder | Returns |
|--------------|---------|---------|
| Bar Chart | `buildBarChart()` | `{ chart: { rows }, meta }` |
| Line Chart | `buildLineChart()` | `{ chart: { rows }, meta }` |
| Scatter Plot | `buildScatterPlot()` | `{ chart: { rows }, meta }` |
| Force Graph | `buildForceGraph()` | `{ graph: { nodes, links }, meta }` |
| Sankey | `buildSankey()` | `{ sankey: { nodes, links }, meta }` |

## API Reference

### Main Export: fetchVisData()

```js
export async function fetchVisData(options) -> Promise<FetchResult>
```

Fetches raw SPARQL data from an endpoint.

**Parameters:**
- `endpoint` (string): SPARQL endpoint URL
- `query` (string): SPARQL SELECT query
- `jsonData` (Object, optional): Pre-computed SPARQL result (alternative to endpoint+query)
- `proxyUrl` (string, optional): CORS proxy URL for endpoints without CORS support
- `retries` (number, optional): Number of retry attempts (default: 2)
- `timeout` (number, optional): Request timeout in milliseconds (default: 30000)

**Returns:** Promise that resolves to:
```js
{
  status: 'success' | 'error',
  raw: Object,           // SPARQL JSON results (if success)
  message: string,       // Error message (if error)
  endpoint: string,
  proxyUsed: boolean
}
```

**Throws:** Nothing - errors are captured in result object

### Retry Logic

`fetchVisData()` automatically retries failed requests:

- **Retry Conditions**: Network errors, timeouts, 5xx server errors
- **No Retry**: 4xx client errors (invalid query, bad endpoint)
- **Exponential Backoff**: 1s → 2s → 4s between retries

### Error Handling

Common error scenarios:

```js
const result = await fetchVisData({
  endpoint: 'https://invalid-endpoint.example.org',
  query: 'SELECT ...'
});

// result.status === 'error'
// result.message contains error details
```

Error types:

| Error Type | Cause | Solution |
|-----------|-------|----------|
| Invalid endpoint | Malformed URL or unreachable host | Check URL, enable CORS proxy |
| Network error | CORS, timeout, connection refused | Use proxyUrl option |
| Invalid SPARQL | Syntax error in query | Validate query in endpoint UI |
| Malformed results | Invalid JSON response | Check endpoint compliance |

### CORS Proxy Support

For endpoints without CORS support:

```js
const result = await fetchVisData({
  endpoint: 'https://some-endpoint.org/sparql',
  query: 'SELECT ...',
  proxyUrl: 'http://localhost:3001/sparql-proxy'
});
```

The proxy will:
1. Receive the fetch request from browser
2. Forward it to the actual endpoint server-side
3. Return results to browser (avoiding CORS issues)

See [@wimmics/venus-proxy](../proxy) for proxy setup.

## Integration with Other Packages

### With Components

```js
import { fetchVisData } from '@wimmics/venus-import';

const component = document.querySelector('venus-graph');
component.sparqlEndpoint = 'https://dbpedia.org/sparql';
component.sparqlQuery = 'SELECT ?source ?target WHERE { ... }';

// Component internally uses fetchVisData during launch()
await component.launch();
```

### With Encoding

```js
import { fetchVisData } from '@wimmics/venus-import';
import { createEncodingManager } from '@wimmics/venus-encoding';

const result = await fetchVisData({
  endpoint: 'https://dbpedia.org/sparql',
  query: 'SELECT ?category ?value ?region { ... }'
});

const manager = createEncodingManager(VIS_TYPES.VENUS_BARCHART);
manager.validateReferencedFields(encoding, result.raw.head.vars);
```

### With Transform

```js
import { fetchVisData } from '@wimmics/venus-import';
import { createSparqlMapper } from '@wimmics/venus-transform';

const result = await fetchVisData({ endpoint, query });
const mapper = createSparqlMapper(VIS_TYPES.VENUS_BARCHART);
const mappedData = mapper.map(result.raw, { encoding });
```

## Related Packages

- [@wimmics/venus-transform](../transform) - Data transformation
- [@wimmics/venus-encoding](../encoding) - Encoding validation
- [@wimmics/venus-visual-mapping](../visual-mapping) - Artifact compilation
- [@wimmics/venus-proxy](../proxy) - CORS proxy for restricted endpoints
- [@wimmics/venus-core](../core) - Shared types

## Performance Tips

1. **Use Pre-computed Results**: If you have SPARQL results already, pass `jsonData` instead of making a new query
2. **Limit Result Size**: Add `LIMIT` to SPARQL queries to reduce data transfer
3. **Use Proxy Locally**: For development, run the proxy locally to reduce latency
4. **Cache Results**: Store results client-side to avoid repeated queries

## See Also

- [Full Visualization Documentation](https://wimmics.github.io/venus/)
- [SPARQL Query Language](https://www.w3.org/TR/sparql11-query/)

## License

See LICENSE in the repository root.
