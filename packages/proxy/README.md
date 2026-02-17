# @wimmics/venus-sparql-proxy

Small Node.js proxy to forward SPARQL requests and avoid browser CORS issues.

## Responsibilities
- Expose `/sparql-proxy` endpoint for SPARQL forwarding.
- Support GET/POST input and fetch endpoint fallback behavior.
- Provide a simple health endpoint (`/proxy-status`).

## Package Links
- Depends on:
  - No internal Venus packages.
- Used by:
  - `@wimmics/venus-sparql` (as optional proxy URL target)
  - `@wimmics/venus-components` (`vis-graph` / `vis-barchart`) and apps via proxy configuration.
