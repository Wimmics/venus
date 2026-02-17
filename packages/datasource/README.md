# @wimmics/venus-datasource

Orchestration layer that builds visualization data from query inputs.

## Responsibilities
- Fetch raw SPARQL results (with retry support).
- Run the shared build pipeline (`buildVis`) and delegate mapping.
- Expose visualization-oriented builders:
- `buildForceGraph` -> returns `{ graph: { nodes, links }, meta }`
- `buildBarChart` -> returns `{ chart: { rows }, meta }`

## Package Links
- Depends on:
  - `@wimmics/venus-sparql` (fetching)
  - `@wimmics/venus-mappers` (raw -> graph mapping)
- Used by:
  - `@wimmics/venus-components` (`vis-graph` and `vis-barchart` launch flows).
