# @wimmics/venus-d3renderer

D3-based rendering runtime for Venus graph visualizations.

## Responsibilities
- Render force-directed graphs to SVG (`ForceGraphRenderer`).
- Render bar charts to SVG (`BarChartRenderer`).
- Apply encoding-driven scales and compiled visual artifacts to marks.
- Manage renderer lifecycle updates (`render`, `updateData`, `updateEncoding`, `resize`, `destroy`).

## Package Links
- Depends on:
  - D3 runtime
  - An encoding manager instance (injected by consumer)
- Used by:
  - `@wimmics/venus-components` (`venus-graph` and `venus-barchart` use this renderer).
