# @wimmics/venus-sparql-proxy

Small Node.js proxy server to forward SPARQL requests and avoid browser CORS issues.

When a SPARQL endpoint doesn't support CORS, the browser cannot directly fetch data. This proxy receives requests from the browser, forwards them to the endpoint server-side (avoiding CORS restrictions), and returns results to the browser.

## Responsibilities

- **Request Forwarding**: Routes SPARQL requests from browser to endpoint
- **CORS Bypass**: Eliminates CORS errors through server-side forwarding
- **Method Support**: Handles both GET and POST SPARQL requests
- **Fallback Behavior**: Attempts multiple request strategies
- **Health Checking**: Provides `/proxy-status` endpoint for monitoring

## Installation

```bash
npm install @wimmics/venus-sparql-proxy
```

## Quick Start

### Starting the Proxy

```bash
node proxy.js
```

By default, the proxy starts on `http://localhost:3001`.

### Configuration

Environment variables:

```bash
PORT=3001                    # Proxy server port (default: 3001)
PROXY_ENDPOINT=/sparql-proxy # Proxy endpoint path (default: /sparql-proxy)
```

### Using with VENUS Components

```js
// Configure component to use proxy
const component = document.querySelector('venus-graph');

component.sparqlEndpoint = 'https://restricted-endpoint.org/sparql';
component.proxy = 'http://localhost:3001/sparql-proxy';
component.sparqlQuery = 'SELECT ?source ?target { ... }';

await component.launch();
```

## API Reference

### POST `/sparql-proxy`

Forwards SPARQL queries to the configured endpoint.

**Request:**
```json
{
  "endpoint": "https://dbpedia.org/sparql",
  "query": "SELECT ?subject { ?subject a dbo:Person } LIMIT 10",
  "format": "json"
}
```

**Response:**
```json
{
  "head": { "vars": ["subject"] },
  "results": { "bindings": [...] }
}
```

### GET `/proxy-status`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600
}
```

## Setup Instructions

### Local Development

1. **Install Node.js**
   ```bash
   # macOS
   brew install node
   
   # Or from https://nodejs.org/
   ```

2. **Install proxy**
   ```bash
   cd packages/proxy
   npm install
   ```

3. **Start proxy**
   ```bash
   npm start
   # or
   node proxy.js
   ```

4. **Test proxy**
   ```bash
   curl http://localhost:3001/proxy-status
   # {"status":"ok"}
   ```

### Production Deployment

For production, consider:

1. **Environment-based configuration**
   ```bash
   PORT=3001 node proxy.js
   ```

2. **Process management** (PM2, systemd, Docker)
   ```bash
   pm2 start proxy.js
   ```

3. **Reverse proxy** (nginx, Apache)
   ```nginx
   location /sparql-proxy {
     proxy_pass http://localhost:3001;
   }
   ```

4. **Monitoring and logging**
   - Monitor `/proxy-status` endpoint
   - Set up error alerting

## Common Use Cases

### DBpedia Queries

DBpedia doesn't require a proxy (has CORS), but for demonstration:

```js
component.proxy = 'http://localhost:3001/sparql-proxy';
component.sparqlEndpoint = 'https://dbpedia.org/sparql';
```

### Internal Enterprise SPARQL Endpoints

For restricted enterprise endpoints without CORS:

```js
component.proxy = 'https://your-proxy.company.com/sparql-proxy';
component.sparqlEndpoint = 'https://internal-sparql.company.com/sparql';
```

## Security Considerations

⚠️ **Important:** This proxy is designed for development/controlled environments.

For production use:

1. **Whitelist endpoints**: Only allow specific SPARQL endpoints
2. **Authentication**: Require API keys or tokens
3. **Rate limiting**: Prevent abuse with request throttling
4. **Query validation**: Validate SPARQL queries for safety
5. **HTTPS only**: Use TLS/SSL in production
6. **Access control**: Restrict proxy access to trusted networks

Example hardened proxy implementation:

```js
// Whitelist allowed endpoints
const ALLOWED_ENDPOINTS = [
  'https://dbpedia.org/sparql',
  'https://wikidata.org/sparql'
];

// Validate endpoint
if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
  return 403; // Forbidden
}
```

## Integration with VENUS

### Components

All VENUS components support the proxy option:

```js
venus-graph.proxy = 'http://localhost:3001/sparql-proxy';
venus-barchart.proxy = 'http://localhost:3001/sparql-proxy';
venus-linechart.proxy = 'http://localhost:3001/sparql-proxy';
venus-scatterplot.proxy = 'http://localhost:3001/sparql-proxy';
venus-sankey.proxy = 'http://localhost:3001/sparql-proxy';
```

### Import Package

The `@wimmics/venus-import` package handles proxy routing internally when configured:

```js
import { fetchVisData } from '@wimmics/venus-import';

const result = await fetchVisData({
  endpoint: 'https://restricted-endpoint.org/sparql',
  query: 'SELECT ...',
  proxyUrl: 'http://localhost:3001/sparql-proxy'
});
```

## Troubleshooting

### Proxy Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:3001
```

**Solution:** Ensure proxy is running (`npm start`)

### SPARQL Endpoint Unreachable

```
Error: connect ECONNREFUSED (endpoint-host)
```

**Solution:** 
- Verify endpoint URL is correct
- Check network connectivity from proxy server
- Verify endpoint is running and accessible

### 403 Forbidden from SPARQL Endpoint

```
HTTP 403 Forbidden
```

**Solution:**
- Endpoint may require authentication
- Check endpoint access restrictions
- Add authentication to proxy (advanced)

## Related Packages

- [@wimmics/venus-import](../import) - Uses proxy for SPARQL requests
- [@wimmics/venus-components](../components) - Web components accept proxy URL
- [@wimmics/venus-core](../core) - Shared types

## See Also

- [Full VENUS Documentation](https://wimmics.github.io/venus/)
- [SPARQL Protocol](https://www.w3.org/TR/sparql11-protocol/)
- [Express.js Documentation](https://expressjs.com/) (if extending proxy)

## License

See LICENSE in the repository root.
