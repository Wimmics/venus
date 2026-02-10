# @wimmics/kgnovis-datasource

Orchestration layer that builds visualization data from query inputs.

## Responsibilities
- Fetch raw SPARQL results (with retry support).
- Run the shared build pipeline (`buildVis`) and delegate mapping.
- Expose visualization-oriented builders:
- `buildForceGraph` -> returns `{ graph: { nodes, links }, meta }`
- `buildBarChart` -> returns `{ chart: { rows }, meta }`

## Package Links
- Depends on:
  - `@wimmics/kgnovis-sparql` (fetching)
  - `@wimmics/kgnovis-mappers` (raw -> graph mapping)
- Used by:
  - `@wimmics/kgnovis-components` (`vis-graph` and `vis-barchart` launch flows).
