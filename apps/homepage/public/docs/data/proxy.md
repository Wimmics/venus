# Proxy

Use a proxy when browser CORS policies prevent direct SPARQL requests. A proxy acts as an intermediary server between VENUS and the SPARQL endpoint. 

```js
component.proxy = "http://localhost:3030/proxy";
```

## Configuration

At minimum, the proxy receives requests from VENUS web components, forwards them to the remote SPARQL endpoint, retrieves the response, and returns it to VENUS.

**You only need to configure a local proxy if you encounter CORS errors.** If the SPARQL endpoint exposes the appropriate Cross-Origin Resource Sharing (CORS) headers, the proxy is not required.

### Recommended Solution

The recommended approach is to deploy a lightweight Node.js server acting as a proxy. A minimal implementation is provided in `@wimmics/venus-sparql-proxy`.



