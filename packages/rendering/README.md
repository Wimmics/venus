# @wimmics/venus-rendering

D3-based SVG rendering engines for VENUS visualizations.

Provides the rendering layer that transforms compiled visual artifacts into interactive SVG visualizations. Each visualization type has its own renderer optimized for that type's specific layout and interaction patterns.

## Responsibilities

- **Rendering Pipeline**: Converts data and visual artifacts into interactive SVG visualizations
- **Mark Rendering**: Renders visualization-specific marks (bars, lines, circles, nodes, links, etc.)
- **Encoding Application**: Applies encoding-driven scales and visual properties to marks
- **Interaction Handling**: Manages tooltips, hover effects, and user interactions
- **Lifecycle Management**: Handles render, resize, and destroy operations
- **D3 Integration**: Uses D3.js for SVG manipulation and scales

## Installation

```bash
npm install @wimmics/venus-rendering
```

## Quick Start

### Using the Factory Function

```js
import { createRenderer } from '@wimmics/venus-rendering';
import { VIS_TYPES } from '@wimmics/venus-core';

// Create a bar chart renderer
const renderer = createRenderer(VIS_TYPES.VENUS_BARCHART, {
  container: document.querySelector('#chart'),
  width: 800,
  height: 600,
  callbacks: {
    onHover: (datum) => console.log('Hovered:', datum),
    onClick: (datum) => console.log('Clicked:', datum)
  }
});

// Render visualization
renderer.render(payload, visualArtifacts);

// Handle resizing
window.addEventListener('resize', () => {
  renderer.resize(newWidth, newHeight);
});
```

## Visualization Types

| Type | Renderer | Purpose |
|------|----------|---------|
| Bar Chart | `BarChartRenderer` | Grouped/stacked categorical bars |
| Line Chart | `LineChartRenderer` | Multi-series line with optional points |
| Scatter Plot | `ScatterPlotRenderer` | 2D point distribution |
| Force Graph | `ForceGraphRenderer` | Physics-simulated node-link diagram |
| Sankey | `SankeyRenderer` | Hierarchical flow diagram |

## API Reference

### Factory Function

```js
export function createRenderer(visType, options) -> BaseRenderer
```

Creates a visualization-type-specific renderer instance.

**Parameters:**
- `visType` (string): Visualization type (e.g., `VIS_TYPES.VENUS_BARCHART`)
- `options` (Object):
  - `container` (HTMLElement): DOM element where SVG will be appended
  - `width` (number): Chart width in pixels (default: 800)
  - `height` (number): Chart height in pixels (default: 600)
  - `callbacks` (Object): Interaction callbacks
    - `onHover(datum)`: Called when mark is hovered
    - `onOut(datum)`: Called when mouse leaves mark
    - `onClick(datum)`: Called when mark is clicked

**Returns:** BaseRenderer instance (type-specific subclass)

### Renderer Methods

#### `render(payload, visualArtifacts)`
Performs complete render cycle: parse data, validate, apply encoding, render SVG.

**Parameters:**
- `payload` (Object): Visualization data (structure depends on type)
- `visualArtifacts` (Object): Pre-compiled visual artifacts with scales, legends, etc.

**Returns:** void

#### `resize(width, height, payload, visualArtifacts)`
Updates container dimensions and re-renders.

**Parameters:**
- `width` (number): New width in pixels
- `height` (number): New height in pixels
- `payload` (Object, optional): New data payload (uses previous if omitted)
- `visualArtifacts` (Object, optional): New visual artifacts

**Returns:** void

#### `destroy()`
Removes rendered SVG and clears internal state.

**Returns:** void

## Mark Attributes

Renderers apply encoding-driven attributes to marks:

| Attribute | Types Supported | Purpose |
|-----------|-----------------|---------|
| `color` | All | Mark fill color |
| `stroke` | All | Mark outline (color, width) |
| `opacity` | Graph, Sankey | Mark transparency |
| `size` | Bar, Line, Scatter, Graph | Mark dimension |
| `label` | All | Text labels on marks |
| `tooltip` | All | Hover information |

## Callback Patterns

Renderers emit interaction callbacks with datum information:

```js
renderer.callbacks.onHover = (datum) => {
  // datum includes data fields + render metadata
  console.log(datum.x, datum.y, datum.color);
};

renderer.callbacks.onOut = (datum) => {
  // Clean up hover state
};

renderer.callbacks.onClick = (datum) => {
  // Handle selection
};
```

## Performance Considerations

- **Large Datasets**: For 1000+ data points, consider aggregation at the data transformation layer
- **Frequent Updates**: Use `resize()` rather than `destroy()` + `render()` for responsive layouts
- **Smooth Interactions**: Renderers batch DOM updates within animation frames
- **Memory**: Call `destroy()` when visualization is no longer needed

## Related Packages

- [@wimmics/venus-encoding](../encoding) - Encoding specification and validation
- [@wimmics/venus-visual-mapping](../visual-mapping) - Visual artifacts compilation
- [@wimmics/venus-transform](../transform) - Data transformation
- [@wimmics/venus-components](../components) - Web component layer

## See Also

- [Full Visualization Documentation](https://wimmics.github.io/venus/)
- [D3.js Documentation](https://d3js.org/)

## License

See LICENSE in the repository root.
