# @wimmics/venus-import

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
  - `@wimmics/venus-transform` (raw -> graph mapping)
- Used by:
  - `@wimmics/venus-components` (`venus-graph` and `venus-barchart` launch flows).
