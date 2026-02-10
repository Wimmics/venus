# @wimmics/kgnovis-d3renderer

D3-based rendering runtime for KGnoVis graph visualizations.

## Responsibilities
- Render force-directed graph nodes/links to SVG.
- Apply encoding-driven scales for node/link color and size.
- Manage simulation, drag interactions, and render lifecycle updates.

## Package Links
- Depends on:
  - D3 runtime
  - An encoding manager instance (injected by consumer)
- Used by:
  - `@wimmics/kgnovis-components` (`vis-graph` uses this renderer).
