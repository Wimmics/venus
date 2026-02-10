# @wimmics/kgnovis-core

Minimal shared utilities used across the KGnoVis monorepo.

## Responsibilities
- Provide cross-package primitives with no visualization logic.
- Expose a lightweight scoped logger (`createLogger`).
- Keep shared concerns centralized to avoid duplicated helpers.

## Package Links
- Used by:
  - `@wimmics/kgnovis-components`
  - `@wimmics/kgnovis-encoding`
  - `@wimmics/kgnovis-sparql`
  - `@wimmics/kgnovis-mappers` (indirectly through consumers)
- Depends on:
  - No internal KGnoVis packages.
