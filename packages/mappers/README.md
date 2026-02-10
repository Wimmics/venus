# @wimmics/kgnovis-mappers

Transforms raw SPARQL JSON results into visualization-ready structures.

## Responsibilities
- Define mapper abstractions (`SparqlToVisMapper`) and registry/factory.
- Provide concrete mapping implementations:
- `SparqlToForceGraphMapper` -> `{ nodes, links }`
- `SparqlToBarChartMapper` -> `{ rows }`
- Extract stable labels from SPARQL bindings for URI and literal values.

## Package Links
- Depends on:
  - `@wimmics/kgnovis-core` (optional logging in mapper flows)
- Used by:
  - `@wimmics/kgnovis-datasource` (mapping stage)
  - `@wimmics/kgnovis-components` (indirectly via datasource).
