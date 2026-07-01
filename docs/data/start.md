# Data

Data acquisition is performed through SPARQL `SELECT` queries, which can either be executed by the visualization component or provided externally. When a query is specified, the component automatically retrieves data from the configured SPARQL endpoint.

Because cross-origin access remains constrained by browser same-origin policies, each component supports the configuration of a [`proxy`](./proxy.md) server. This enables access to endpoints that do not expose the required Cross-Origin Resource Sharing (CORS) headers.

## Data Fetching Options

The `fetchVisData` function provides additional configuration options for controlling data retrieval behavior:

```js
import { fetchVisData } from '@wimmics/venus-import';

const data = await fetchVisData({
  endpoint: 'https://query.wikidata.org/sparql',
  query: 'SELECT ...',
  retries: 3,
  retryDelayMs: 500,
  timeoutMs: 300000
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | — | SPARQL endpoint URL. |
| `query` | `string` | — | SPARQL SELECT query. |
| `retries` | `number` | `0` | Number of automatic retry attempts if the request fails. |
| `retryDelayMs` | `number` | `250` | Delay in milliseconds between retry attempts. |
| `timeoutMs` | `number` | `300000` | Request timeout in milliseconds (default: 5 minutes). |

### Special Handling

**Wikidata**: When querying `query.wikidata.org`, an `origin=*` parameter is automatically added to bypass CORS restrictions.

### Fallback Strategy

When a [`proxy`](./proxy.md) is configured, the system uses the following fallback strategy:

1. **Try via proxy**: Send request to proxy endpoint
2. **Fallback to direct**: If proxy fails, attempt direct connection to SPARQL endpoint
3. **CORS detection**: Automatically detects CORS errors and suggests using a proxy
