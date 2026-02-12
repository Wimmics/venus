# @wimmics/kgnovis-webcomponents

Browser-facing Web Components for KG visualization and node metadata.

## Responsibilities
- Provide `<vis-graph>` for graph loading, rendering, encoding, and interaction.
- Provide `<vis-barchart>` for bar-chart loading, rendering, encoding, and legends.
- Provide `<vis-uri-meta>` for URI/node metadata display.
- Coordinate datasource, mapper, encoding manager, renderer, and legends.

## Common Attributes (`<vis-graph>`, `<vis-barchart>`)
- `width`: component width. Accepts numeric values (`"800"` -> `800px`) or CSS dimensions (`"100%"`, `"70vw"`).
- `height`: component height. Accepts numeric values (`"600"` -> `600px`) or CSS dimensions (`"100%"`, `"60vh"`).
- `resize`: enables/disables responsive re-rendering on container/window size changes.
  - Default: enabled.
  - Disable with `resize="false"` (also `0`, `no`, `off`).

Example:

```html
<vis-graph
  width="100%"
  height="420"
  resize="true"
></vis-graph>

<vis-barchart
  width="900"
  height="500"
  resize="false"
></vis-barchart>
```

Note:
- When using percentage sizes like `height="100%"`, parent containers must have explicit height for the component to have measurable space.

## Package Links
- Depends on:
  - `@wimmics/kgnovis-core`
  - `@wimmics/kgnovis-datasource`
  - `@wimmics/kgnovis-encoding`
  - `@wimmics/kgnovis-mappers`
  - `@wimmics/kgnovis-d3renderer`
  - `@wimmics/kgnovis-sparql`
  - `@wimmics/kgnovis-legends`
- Used by:
  - `apps/playground`
  - External browser apps integrating KGnoVis components.
