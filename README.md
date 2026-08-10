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
- `packages/components`: defines the [`@wimmics/venus`](https://www.npmjs.com/package/@wimmics/venus) package, which provides custom elements (`venus-graph`, `venus-barchart`) and the integration layer.

Internal packages:
- `packages/core`: shared utilities, encoding defaults and structures.
- `packages/import`: fetch data from a given SPARQL endpoint.
- `packages/encoding`: visualization-specific encoding managers, handles default encoding specification and validators.
- `packages/transform`: SPARQL JSON -> visualization data transformation layer.
- `packages/visual-mapping`: compute visual artifacts from encoding and data, creates color/size legend web components, creates and manages tooltips, and computes color/size scales.
- `packages/rendering`: handles the visualization rendering and user interactions using D3.js library.

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
