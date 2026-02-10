# @wimmics/kgnovis-sparql-proxy

Small Node.js proxy to forward SPARQL requests and avoid browser CORS issues.

## Responsibilities
- Expose `/sparql-proxy` endpoint for SPARQL forwarding.
- Support GET/POST input and fetch endpoint fallback behavior.
- Provide a simple health endpoint (`/proxy-status`).

## Package Links
- Depends on:
  - No internal KGnoVis packages.
- Used by:
  - `@wimmics/kgnovis-sparql` (as optional proxy URL target)
  - `@wimmics/kgnovis-components` (`vis-graph` / `vis-barchart`) and apps via proxy configuration.
