# @wimmics/kgnovis-webcomponents

Browser-facing Web Components for KG visualization and node metadata.

## Responsibilities
- Provide `<vis-graph>` for graph loading, rendering, encoding, and interaction.
- Provide `<vis-uri-meta>` for URI/node metadata display.
- Coordinate datasource, mapper, encoding manager, renderer, and legends.

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
