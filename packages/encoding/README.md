# @wimmics/kgnovis-encoding

Encoding engine that resolves visual mappings (field -> domain -> scale).

## Responsibilities
- Provide visualization-specific encoding managers (currently force-graph).
- Compute domains from data (`DomainCalculator`).
- Build color scales and palette handling (`ColorScaleCalculator`).
- Compute validated size ranges from encoding + data (`SizeRangeCalculator`).
- Cache and serve D3 scales for renderers.

## Internal Structure
- `src/utils/compute-domain.js`: domain computation and validation.
- `src/utils/build-color-range.js`: color range parsing and color scale support.
- `src/utils/build-size-range.js`: size range normalization/fallback logic.
- `src/utils/build-bin-breaks.js`: quantitative bin computation (Jenks/quartiles).

## Quantitative Binning
- For quantitative scales, binning is supported with `scale.binning`.
- Options:
  - `method`: `"jenks"` (default) or `"quartiles"`
  - `bins`: number of bins (default `5`)
- Binned scales are rendered with threshold behavior (`d3.scaleThreshold`) for both color and size.

## Package Links
- Depends on:
  - `@wimmics/kgnovis-core` (logging)
- Used by:
  - `@wimmics/kgnovis-components` (main consumer)
  - `@wimmics/kgnovis-renderer-d3` (through injected manager from components)
  - `@wimmics/kgnovis-datasource` and `@wimmics/kgnovis-mappers` (context during graph build).
