# @wimmics/venus-core

Shared utilities and constants for the VENUS monorepo.

Core provides fundamental types and constants used across all VENUS packages, with no visualization logic or dependencies on other VENUS packages.

## Responsibilities

- **Type Definitions**: Shared visualization identifiers and constants
- **Enumerations**: VIS_TYPES, MARK_TYPES, CHANNEL_TYPES, ATTRIBUTE_TYPES
- **Utilities**: Shared helper functions with no visualization dependencies
- **Centralization**: Avoid duplication across packages

## Installation

```bash
npm install @wimmics/venus-core
```

## Main Exports

### Visualization Types

```js
import { VIS_TYPES } from '@wimmics/venus-core';

// All 5 visualization types
VIS_TYPES.VENUS_GRAPH        // Force-directed graph
VIS_TYPES.VENUS_BARCHART     // Bar chart
VIS_TYPES.VENUS_LINECHART    // Line chart
VIS_TYPES.VENUS_SCATTERPLOT  // Scatter plot
VIS_TYPES.VENUS_SANKEY       // Sankey diagram
```

### Mark Types

```js
import { MARK_TYPES } from '@wimmics/venus-core';

MARK_TYPES.NODES   // Graph nodes
MARK_TYPES.LINKS   // Graph links
MARK_TYPES.BARS    // Bar chart bars
MARK_TYPES.LINES   // Line chart lines
MARK_TYPES.POINTS  // Scatter points, line endpoints
```

### Channel Types

```js
import { CHANNEL_TYPES } from '@wimmics/venus-core';

CHANNEL_TYPES.COLOR     // Color encoding
CHANNEL_TYPES.SIZE      // Size encoding
CHANNEL_TYPES.STROKE    // Stroke styling
CHANNEL_TYPES.OPACITY   // Opacity encoding
CHANNEL_TYPES.LABEL     // Text labels
CHANNEL_TYPES.TOOLTIP   // Tooltip content
```

### Attribute Types

```js
import { ATTRIBUTE_TYPES } from '@wimmics/venus-core';

ATTRIBUTE_TYPES.COLOR
ATTRIBUTE_TYPES.FILL
ATTRIBUTE_TYPES.STROKE
ATTRIBUTE_TYPES.STROKE_WIDTH
ATTRIBUTE_TYPES.OPACITY
ATTRIBUTE_TYPES.SIZE
// ... and more rendering attributes
```

### Encoding Templates

```js
import { getEncodingTemplate } from '@wimmics/venus-core';

// Get default encoding for a visualization type
const template = getEncodingTemplate(VIS_TYPES.VENUS_BARCHART);
```

## Usage Examples

### Checking Visualization Type

```js
import { VIS_TYPES } from '@wimmics/venus-core';

function createVisualizer(visType) {
  if (visType === VIS_TYPES.VENUS_GRAPH) {
    // Graph-specific setup
  } else if (visType === VIS_TYPES.VENUS_BARCHART) {
    // Bar chart setup
  }
}
```

### Mark Type Validation

```js
import { MARK_TYPES } from '@wimmics/venus-core';

const supportedMarks = [
  MARK_TYPES.NODES,
  MARK_TYPES.LINKS
];
```

## Package Relationships

**Used by:**
- `@wimmics/venus-components` - Web component layer
- `@wimmics/venus-encoding` - Encoding specification
- `@wimmics/venus-rendering` - SVG rendering
- `@wimmics/venus-transform` - Data transformation
- `@wimmics/venus-visual-mapping` - Visual artifacts
- `@wimmics/venus-import` - Data fetching

**Dependencies:**
- None (zero external dependencies)

## See Also

- [Full VENUS Documentation](https://wimmics.github.io/venus/)
- Component packages for implementation details

## License

See LICENSE in the repository root.
