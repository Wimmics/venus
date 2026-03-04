# @wimmics/venus-sparql

SPARQL data access layer for query execution and metadata retrieval.

## Responsibilities
- Execute SPARQL queries with proxy/direct fallback strategy.
- Provide reusable metadata query templates and metadata fetch helpers.
- Normalize fetch outcomes for higher-level packages.

## Package Links
- Depends on:
  - `@wimmics/venus-core` (logging)
- Used by:
  - `@wimmics/venus-datasource`
  - `@wimmics/venus-components` (`venus-graph` and `venus-barchart` through datasource)
  - Any app that wants direct SPARQL querying utilities.
