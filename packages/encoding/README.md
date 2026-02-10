# @wimmics/kgnovis-encoding

Encoding engine that resolves visual mappings (field -> domain -> scale).

## Responsibilities
- Provide visualization-specific encoding managers (currently force-graph).
- Compute domains from data (`DomainCalculator`).
- Build color scales and palette handling (`ColorScaleCalculator`).
- Cache and serve D3 scales for renderers.

## Package Links
- Depends on:
  - `@wimmics/kgnovis-core` (logging)
- Used by:
  - `@wimmics/kgnovis-components` (main consumer)
  - `@wimmics/kgnovis-renderer-d3` (through injected manager from components)
  - `@wimmics/kgnovis-datasource` and `@wimmics/kgnovis-mappers` (context during graph build).
