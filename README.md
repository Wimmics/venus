# VENUS: Visual Ecosystem for kNowledge graph Understanding Systems

This repository is dedicated to VENUS, a JavaScript library for creating interactive visualizations and dashboards from SPARQL queries.

## Overview

This repository contains the source code for:

- The VENUS JavaScript library
- A website with documentation and usage information
- A web editor to explore available VENUS visualizations and encodings
- A set of encoding and query examples
- A set of example apps showing how to use the library
- A minimal SPARQL proxy to use the library with non-CORS endpoints

## VENUS JavaScript library

The library is defined in the [`packages`](./packages/) folder and includes the following packages.

NPM published package:
- `packages/components`: defines the [`@wimmics/venus-elements`](https://www.npmjs.com/package/@wimmics/venus-elements) package, which provides custom elements (`venus-graph`, `venus-barchart`) and the integration layer.

Internal packages:
- `packages/core`: shared low-level utilities (`VIS_TYPES`).
- `packages/datasource`: fetch + retry + map orchestration for visualization data (`buildForceGraph`, `buildBarChart`).
- `packages/encoding`: domain and scale computation, visualization-specific encoding managers, and visual-artifact compilers.
- `packages/legends`: color/size legend web components and factory helpers used by graph and bar chart.
- `packages/mappers`: SPARQL JSON -> visualization data mapping layer (force graph and bar chart).
- `packages/renderer-d3`: D3 renderer runtime (force graph and bar chart).
- `packages/sparql`: SPARQL fetchers and metadata query helpers.

SPARQL proxy package:
- `packages/proxy`: defines the [`@wimmics/venus-sparql-proxy`](https://www.npmjs.com/package/@wimmics/venus-sparql-proxy), a standalone SPARQL proxy server for CORS workarounds.

## VENUS Editor

The VENUS Editor helps you discover available visualization components and test encodings before integrating them into a web application. Browse the provided [examples](./examples/) to explore VENUS capabilities.

Try it [here](https://wimmics.github.io/venus/editor).

## Website

A website presenting the tool and its documentation is available [here](https://wimmics.github.io/venus/).

## Example Apps

VENUS is developed with web components that can be integrated into any web application. The [example-apps](./example-apps/) directory provides ready-to-use minimal Vanilla JS code to support easy integration and quick testing.

## Getting started

- Install dependencies: `npm install`
- Build VENUS packages: `npm run build`
- Run homepage: `npm run dev`
- Run editor: `npm run dev:editor`

## License
See [LICENSE](LICENSE)
