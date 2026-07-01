# Proxy

Use a proxy when browser CORS policies prevent direct SPARQL requests. A proxy acts as an intermediary server between VENUS and the SPARQL endpoint. 

```js
component.proxy = "http://localhost:3001/sparql-proxy";
```

## Configuration

At minimum, the proxy receives requests from VENUS web components, forwards them to the remote SPARQL endpoint, retrieves the response, and returns it to VENUS.

**You only need to configure a local proxy if you encounter CORS errors.** If the SPARQL endpoint exposes the appropriate Cross-Origin Resource Sharing (CORS) headers, the proxy is not required.

### Recommended Solution

The recommended approach is to deploy a lightweight Node.js server acting as a proxy. A minimal implementation is provided in `@wimmics/venus-sparql-proxy`.

### Proxy Endpoint

The VENUS proxy server exposes the following endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/sparql-proxy` | GET, POST | Main SPARQL forwarding endpoint. Accepts SPARQL queries and forwards them to the configured remote endpoint. |
| `/proxy-status` | GET | Health check endpoint. Returns status of the proxy server. |

### Proxy Configuration

Configure the proxy using environment variables:

| Variable | Default | Description |
|---|---|---|
| `PROXY_PORT` | `3001` | Port on which the proxy server listens. |

**Example:**

```bash
PROXY_PORT=3001 node @wimmics/venus-sparql-proxy
```

Then configure the component:

```js
component.proxy = "http://localhost:3001/sparql-proxy";
```



