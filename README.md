# Venus Monorepo

Venus is a modular toolkit to fetch SPARQL data, map it to visualization structures, encode visuals, and render interactive components in the browser.

## Architecture

High-level flow:

`apps/*` -> `@wimmics/venus-webcomponents` -> `@wimmics/venus-datasource` -> `@wimmics/venus-sparql` + `@wimmics/venus-mappers` -> vis data (`{nodes, links}` or `{rows}`) -> `@wimmics/venus-encoding` -> `@wimmics/venus-d3renderer` + `@wimmics/venus-legends`

Optional network helper:

`@wimmics/venus-sparql-proxy` can be used by clients when endpoint CORS prevents direct browser calls.

## Packages

- `packages/components`: browser custom elements (`vis-graph`, `vis-barchart`, `vis-uri-meta`) and integration layer.
- `packages/core`: shared low-level utilities (`createLogger`, `VIS_TYPES`).
- `packages/datasource`: fetch + retry + map orchestration for visualization data (`buildForceGraph`, `buildBarChart`).
- `packages/encoding`: domain and scale computation, visualization-specific encoding managers and visual-artifact compilers.
- `packages/legends`: color/size legend web components and factory helpers used by graph and bar chart.
- `packages/mappers`: SPARQL JSON -> visualization data mapping layer (force graph and bar chart).
- `packages/proxy`: standalone SPARQL proxy server for CORS workarounds.
- `packages/renderer-d3`: D3 renderer runtime (force graph and bar chart).
- `packages/sparql`: SPARQL fetchers and metadata query helpers.

Each package has its own minimal README with responsibilities and links.

## Getting started

- Install dependencies: `npm install`
- Run playground: `npm run dev`
