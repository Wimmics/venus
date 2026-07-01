# @wimmics/venus-visual-mapping

Manages visual artifacts (legends, scales, tooltips) and D3.js scale factories for VENUS visualization components.

The visual-mapping package is responsible for:
- **Visual Artifact Compilation**: Converts encoding specifications into renderable visual elements (legends, axes, color/size scales)
- **Scale Management**: Creates and caches D3 scales (linear, ordinal, color, threshold, etc.)
- **Legend Rendering**: Generates interactive legends for color, size, and other visual channels
- **Tooltip Management**: Handles contextual tooltips and connection highlighting for interactive visualizations

## Installation

```bash
npm install @wimmics/venus-visual-mapping
```

## Quick Start

### Creating Visual Artifacts

Visual artifacts are compiled from encoding specifications and raw data. Use the factory function to create an artifacts compiler for your visualization type:

```js
import { createVisualArtifactsCompiler, emptyVisualArtifacts } from '@wimmics/venus-visual-mapping';
import { VIS_TYPES } from '@wimmics/venus-core';

const compiler = createVisualArtifactsCompiler(VIS_TYPES.VENUS_BARCHART);

const artifacts = await compiler.compile({
  encoding: {
    bars: {
      x: { field: 'category' },
      y: { field: 'value' },
      color: { 
        field: 'region',
        scale: { type: 'ordinal', range: 'Set2' },
        legend: { title: 'Region', position: 'bottom' }
      }
    }
  },
  data: rawData  // From SPARQL mapper
});

// artifacts = {
//   scales: Map { ... },     // D3 scale functions indexed by ID
//   legends: [ ... ],         // Legend configurations
//   channels: [ ... ],        // Visual channel mappings
//   attributes: [ ... ]       // SVG attribute mappings
// }
```

### Legend Manager

Use the LegendManager to render legends in your visualization:

```js
import { LegendManager } from '@wimmics/venus-visual-mapping';

const legendMgr = new LegendManager({ container: document.querySelector('#chart') });

legendMgr.createLegends({
  data: rowData,
  visualArtifacts: artifacts
});

// Later, update legend positions or destroy
legendMgr.destroyLegends();
```

### Tooltip Management

Create tooltip managers for interactive feedback on mark hover:

```js
import { createTooltipManager } from '@wimmics/venus-visual-mapping';
import { VIS_TYPES } from '@wimmics/venus-core';

const tooltipMgr = createTooltipManager(VIS_TYPES.VENUS_GRAPH, {
  shadowRoot: component.shadowRoot
});

tooltipMgr.showTooltip({
  datum: nodeData,
  x: 150,
  y: 200
});

tooltipMgr.hideTooltip();
```

## Main Exports

### Factory Functions

- **`createVisualArtifactsCompiler(visType)`** - Creates a compiler for translating encoding specs into visual artifacts
- **`emptyVisualArtifacts()`** - Returns an empty visual artifacts structure (scales, legends, channels, attributes)
- **`createTooltipManager(visType, options)`** - Creates a tooltip manager for the visualization type

### Classes

- **`LegendManager`** - Manages legend rendering and positioning
- **`VisualArtifacts`** - Base class for visual artifact compilers (subclassed per visualization type)
- **`TooltipManager`** - Handles basic tooltip display
- **`GraphTooltipManager`** - Specialized tooltip manager for graph/sankey visualizations with connection highlighting

### Scale Factories

- **`D3ScaleFactory`** - Creates D3 scales (linear, sqrt, log, pow, ordinal, band, point, threshold, color)
- **`ColorScaleCalculator`** - Computes color scales from encoding specs
- **`SizeRangeCalculator`** - Computes numeric ranges for size encoding
- **`DomainCalculator`** - Extracts domains from data for scales
- **`BinBreaksCalculator`** - Computes histogram bins for threshold scales

## Folder Structure

```
src/
  visual-artifacts-factory.js       # Factory functions
  visual-artifacts.js               # Base class
  barchart-visual-artifacts.js      # Bar chart artifacts
  cartesian-visual-artifacts.js     # Cartesian chart artifacts (scatter, line)
  graph-visual-artifacts.js         # Node-link diagram artifacts
  linechart-visual-artifacts.js     # Line chart artifacts
  sankey-visual-artifacts.js        # Sankey diagram artifacts
  chart-space-manager.js            # Axis/margin calculation

legends/
  legend-manager.js                 # Legend rendering
  legend-factory.js                 # Legend generation
  color-legend.js                   # Color legend
  size-legend.js                    # Size legend
  opacity-legend.js                 # Opacity legend

scales/
  d3-scale-factory.js               # D3 scale creation
  color-scale-calculator.js         # Color scale computation
  size-range-calculator.js          # Size range computation
  domain-calculator.js              # Domain extraction
  bin-breaks-calculator.js          # Binning calculation

tooltips/
  tooltips-factory.js               # Factory function
  tooltip-manager.js                # Base tooltip manager
  graph-tooltip-manager.js          # Graph-specific tooltips
```

## Configuration

Visual artifacts are configured through the `encoding` specification passed to `compile()`. Key properties:

- **Marks** (nodes, links, bars, etc.)
  - `color` - Color encoding (field, value, scale, legend)
  - `size` - Size encoding (field, value, scale, legend)
  - `stroke` - Stroke styling (value, width, display)
  - `opacity` - Opacity encoding (field, value, scale)

- **Scales**
  - `type` - Scale type: 'linear', 'sqrt', 'log', 'pow', 'ordinal', 'band', 'point', 'threshold', 'quantitative', 'sequential'
  - `domain` - Data domain (auto-computed if not provided)
  - `range` - Visual range (colors, pixel sizes, etc.)
  - `binning` - Threshold binning configuration (for discrete scales)

- **Legends**
  - `position` - 'top', 'bottom', 'left', 'right'
  - `title` - Legend title
  - `display` - Show/hide legend

## API Reference

### Visual Artifact Compilers

Each visualization type has its own artifact compiler (BarChartVisualArtifacts, LineChartVisualArtifacts, etc.)

#### `compile(options)`

Compiles encoding specification and data into visual artifacts.

```js
const artifacts = await compiler.compile({
  encoding: encodingSpec,
  data: rowData
});
```

**Parameters:**
- `encoding` (Object) - Visual encoding specification
- `data` (Array) - Raw data rows from SPARQL mapper

**Returns:** Visual artifacts object with scales, legends, channels, attributes

### Legend Manager

#### Constructor

```js
new LegendManager({ container: domElement })
```

#### `createLegends(options)`

Renders legends based on visual artifacts.

```js
legendMgr.createLegends({
  data: rowData,
  visualArtifacts: artifacts
});
```

#### `destroyLegends()`

Removes all rendered legends from the DOM.

#### `updateLegendPositions(position)`

Repositions all legends to the specified location.

**Parameters:**
- `position` (string) - 'top', 'bottom', 'left', or 'right'

### Tooltip Manager

#### Constructor

```js
new TooltipManager({ shadowRoot, enabled: true })
// or
new GraphTooltipManager({ shadowRoot, enabled: true })  // For graphs/sankeys
```

#### `showTooltip(payload)`

Display a tooltip.

```js
tooltipMgr.showTooltip({
  datum: dataObject,
  x: pixelX,
  y: pixelY
});
```

#### `hideTooltip()`

Hide the current tooltip.

#### `updateEncoding(encodingSpec)`

Update the tooltip configuration based on new encoding.

#### `updateTooltipState(options)`

Update tooltip state (enabled/disabled, field visibility).

## Visualization Type Support

| Feature | Bar Chart | Line Chart | Scatter Plot | Graph | Sankey |
|---------|-----------|-----------|------------|-------|--------|
| Color scale | ✓ | ✓ | ✓ | ✓ | ✓ |
| Size scale | ✓ | ✓ | ✓ | ✓ | ✗ |
| Opacity scale | ✗ | ✗ | ✗ | ✗ | ✓ |
| Color legend | ✓ | ✓ | ✓ | ✓ | ✓ |
| Size legend | ✓ | ✓ | ✓ | ✓ | ✗ |
| Tooltips | ✓ | ✓ | ✓ | ✓ | ✓ |
| Connection highlighting | ✗ | ✗ | ✗ | ✓ | ✓ |

## Development

### Adding a New Scale Type

1. Extend `D3ScaleFactory` with a new method `create[Type]Scale()`
2. Add case to `normalizeScaleType()` to recognize the new type
3. Add examples to documentation

### Adding a New Visual Channel

1. Create a new calculator class (e.g., `StrokeWidthCalculator`)
2. Extend `VisualArtifacts` in the appropriate visualization type class
3. Add to encoding specification documentation

## See Also

- [@wimmics/venus-encoding](../encoding) - Encoding specification and validation
- [@wimmics/venus-rendering](../rendering) - SVG rendering
- [@wimmics/venus-transform](../transform) - SPARQL data transformation

## License

See LICENSE in the repository root.
