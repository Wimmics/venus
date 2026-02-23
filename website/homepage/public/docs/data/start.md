# Data

Data acquisition is performed through SPARQL `SELECT` queries, which can either be executed by the visualization component or provided externally. When a query is specified, the component automatically retrieves data from the configured SPARQL endpoint.

Because cross-origin access remains constrained by browser same-origin policies, each component supports the configuration of a [`proxy`](./proxy.md) server. This enables access to endpoints that do not expose the required Cross-Origin Resource Sharing (CORS) headers.
