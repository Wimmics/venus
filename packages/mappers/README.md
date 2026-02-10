# @wimmics/kgnovis-mappers

Transforms raw SPARQL JSON results into visualization-ready graph structures.

## Responsibilities
- Define mapper abstractions (`SparqlToVisMapper`) and registry/factory.
- Provide concrete SPARQL-to-force-graph mapping implementation.
- Extract stable node ids/labels and build canonical `{ nodes, links }`.

## Package Links
- Depends on:
  - `@wimmics/kgnovis-core` (optional logging in mapper flows)
- Used by:
  - `@wimmics/kgnovis-datasource` (mapping stage)
  - `@wimmics/kgnovis-components` (indirectly via datasource).
