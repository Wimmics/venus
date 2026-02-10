# @wimmics/kgnovis-d3renderer

D3-based rendering runtime for KGnoVis graph visualizations.

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
  - `@wimmics/kgnovis-components` (`vis-graph` and `vis-barchart` use this renderer).
