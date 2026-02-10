# KGnoVis Monorepo

KGnoVis is a modular toolkit to fetch SPARQL data, map it to graph structures, encode visuals, and render interactive knowledge graph components in the browser.

## Architecture

High-level flow:

`apps/*` -> `@wimmics/kgnovis-webcomponents` -> `@wimmics/kgnovis-datasource` -> `@wimmics/kgnovis-sparql` + `@wimmics/kgnovis-mappers` -> graph `{nodes, links}` -> `@wimmics/kgnovis-encoding` -> `@wimmics/kgnovis-d3renderer` + `@wimmics/kgnovis-legends`

Optional network helper:

`@wimmics/kgnovis-sparql-proxy` can be used by clients when endpoint CORS prevents direct browser calls.

## Packages

- `packages/components`: browser custom elements (`vis-graph`, `vis-uri-meta`) and integration layer.
- `packages/core`: shared low-level utilities (currently logger).
- `packages/datasource`: fetch + retry + map orchestration for visualization data.
- `packages/encoding`: domain and scale computation, encoding managers.
- `packages/legends`: color/size legend web components and factory helpers.
- `packages/mappers`: SPARQL JSON -> visualization graph mapping layer.
- `packages/proxy`: standalone SPARQL proxy server for CORS workarounds.
- `packages/renderer-d3`: D3 force-graph renderer runtime.
- `packages/sparql`: SPARQL fetchers and metadata query helpers.

Each package has its own minimal README with responsibilities and links.

## Getting started

- Install dependencies: `npm install`
- Run playground: `npm run dev`
