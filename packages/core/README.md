# @wimmics/venus-core

Minimal shared utilities used across the Venus monorepo.

## Responsibilities
- Provide cross-package primitives with no visualization logic.
- Expose a lightweight scoped logger (`createLogger`).
- Expose shared visualization identifiers (`VIS_TYPES`), including `force-graph` and `bar-chart`.
- Keep shared concerns centralized to avoid duplicated helpers.

## Package Links
- Used by:
  - `@wimmics/venus-components`
  - `@wimmics/venus-encoding`
  - `@wimmics/venus-sparql`
  - `@wimmics/venus-mappers` (indirectly through consumers)
- Depends on:
  - No internal Venus packages.
