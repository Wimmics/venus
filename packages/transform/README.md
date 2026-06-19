# @wimmics/venus-transform

Transforms raw SPARQL JSON results into visualization-ready structures.

## Responsibilities
- Define mapper abstractions (`SparqlToVisMapper`) and registry/factory.
- Provide concrete mapping implementations:
- `SparqlToForceGraphMapper` -> `{ nodes, links }`
- `SparqlToBarChartMapper` -> `{ rows }`
- Extract stable labels from SPARQL bindings for URI and literal values.

## Package Links
- Depends on:
  - `@wimmics/venus-core` (optional logging in mapper flows)
- Used by:
  - `@wimmics/venus-components` (indirectly via datasource).
