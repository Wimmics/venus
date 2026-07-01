# @wimmics/venus-encoding

Encoding specification system and validation for VENUS visualizations.

The encoding module validates user-provided visual encoding specifications and transforms them into visualization-ready configurations with merged defaults. Each visualization type has its own encoding manager that implements type-specific validation rules and defaults.

## Responsibilities

- **Encoding Specification**: Defines encoding schema for visual channels (color, size, opacity, labels, etc.)
- **Encoding Validation**: Validates user encodings against visualization-specific rules and constraints
- **Default Merging**: Merges user encoding with visualization-specific defaults
- **Field Validation**: Ensures referenced fields exist in SPARQL query results
- **Factory Functions**: Provides factory for creating visualization-specific encoding managers
- **Scale Type Support**: Supports specification of multiple scale types (linear, ordinal, sqrt, log, threshold, etc.)

## Installation

```bash
npm install @wimmics/venus-encoding
```

## Quick Start

### Creating an Encoding Manager

Use the factory function to get an encoding manager for your visualization type:

```js
import { createEncodingManager } from '@wimmics/venus-encoding';
import { VIS_TYPES } from '@wimmics/venus-core';

// Create a manager for bar charts
const manager = createEncodingManager(VIS_TYPES.VENUS_BARCHART);

// Define user encoding
const userEncoding = {
  x: { field: 'category' },
  y: { field: 'value' },
  bars: { 
    color: { field: 'region', scale: { type: 'ordinal', range: 'Set2' } },
    stack: true 
  }
};

// Validate encoding
try {
  manager.validateEncoding(userEncoding);
  console.log('✓ Encoding is valid');
} catch (error) {
  console.error('✗ Encoding error:', error.message);
}

// Merge with defaults and validate fields
const sparqlVars = ['category', 'value', 'region'];
manager.validateReferencedFields(userEncoding, sparqlVars);

// Get merged encoding with all defaults applied
const finalEncoding = manager.mergeEncoding(userEncoding);
```

## Visualization Types

All 5 VENUS visualization types are supported with type-specific encoding:

| Type | Component | Encoding Structure | Example Use Case |
|------|-----------|-------------------|------------------|
| Bar Chart | `venus-barchart` | `{ x, y, bars, ... }` | Categorical comparisons |
| Line Chart | `venus-linechart` | `{ x, y, lines, points, ... }` | Time series data |
| Scatter Plot | `venus-scatterplot` | `{ x, y, points, ... }` | Bivariate correlations |
| Force Graph | `venus-graph` | `{ nodes, links, ... }` | Network relationships |
| Sankey | `venus-sankey` | `{ nodes, links, ... }` | Flow/hierarchies |

## Encoding Managers

Each visualization type has its own manager with type-specific validation:

```js
// BarChartEncodingManager
createEncodingManager(VIS_TYPES.VENUS_BARCHART)
  // Validates: x.field, y.field required; bars.stack is boolean/"normalize"

// LineChartEncodingManager  
createEncodingManager(VIS_TYPES.VENUS_LINECHART)
  // Validates: x.field, y.field required; lines.group field

// ScatterPlotEncodingManager
createEncodingManager(VIS_TYPES.VENUS_SCATTERPLOT)
  // Validates: x.field, y.field required; supports color, size encoding

// ForceGraphEncodingManager
createEncodingManager(VIS_TYPES.VENUS_GRAPH)
  // Validates: nodes and links specifications

// SankeyEncodingManager
createEncodingManager(VIS_TYPES.VENUS_SANKEY)
  // Validates: flow structure with optional sorting
```

## Common Encoding Pattern

Most encodings follow a similar structure:

```js
{
  // Optional title shown above visualization
  title: "Sales by Region",
  
  // Optional background color
  background: "#ffffff",
  
  // Mark-specific encoding (bars, points, nodes, links)
  bars: {
    // Data field mapping (depends on visualization type)
    x: { field: 'month' },
    y: { field: 'revenue' },
    
    // Visual channel mappings
    color: {
      field: 'region',                    // Map to this data field
      value: '#999',                      // Constant color fallback
      scale: { 
        type: 'ordinal',                  // Scale type
        range: 'Set2',                    // Color palette
        domain: ['East', 'West']          // Optional explicit domain
      },
      legend: { 
        title: 'Region',
        position: 'bottom',
        display: true
      }
    },
    
    size: {
      field: 'count',
      scale: { type: 'sqrt', range: [5, 20] },
      legend: { title: 'Count', display: true }
    },
    
    // Display options
    stroke: { value: '#000', width: 2, display: true },
    opacity: { value: 1 },
    
    // Labels on marks
    labels: { display: true, field: 'label' },
    
    // Interactions
    tooltip: { fields: ['month', 'revenue', 'region'] }
  },
  
  // Interactions (varies by visualization type)
  interactions: {
    tooltip: true,
    drag: true,    // Graph only
    zoom: true     // Graph only
  }
}
```

## Scale Types

Supported scale types for encoding:

| Scale Type | Use Case | Example |
|------------|----------|---------|
| `linear` | Continuous numeric data | Revenue values |
| `sqrt` | Continuous with emphasis on smaller values | Sizes/areas |
| `log` | Continuous data spanning multiple orders of magnitude | Populations |
| `pow` | Power transformation (configurable exponent) | Custom emphasis |
| `ordinal` | Categorical/discrete data | Regions, categories |
| `band` | Categorical with spacing (for axes) | Axis positions |
| `point` | Categorical without spacing | Point positioning |
| `threshold` | Discrete binning of continuous data | Risk levels, quartiles |
| `quantitative` | Auto-detect continuous scale | Auto choice |
| `sequential` | Color progression | Heatmaps |

### Scale Configuration

```js
color: {
  field: 'value',
  scale: {
    type: 'threshold',
    domain: [0, 100, 200],      // Bin boundaries
    range: ['green', 'yellow', 'red', 'darkred']
  }
}

size: {
  field: 'count',
  scale: {
    type: 'sqrt',
    domain: [1, 100],           // Input range
    range: [5, 50]              // Output pixel range
  }
}
```

## API Reference

### Main Export

```js
export function createEncodingManager(visType) -> EncodingManager
```

Returns an encoding manager instance for the specified visualization type.

**Parameters:**
- `visType` (string): Visualization type (e.g., `VIS_TYPES.VENUS_BARCHART`)

**Returns:** EncodingManager instance (type-specific subclass)

### EncodingManager API

#### `validateEncoding(userEncoding)`
Validates encoding against visualization-specific rules.

**Throws:** Error with descriptive message if validation fails.

#### `validateReferencedFields(encoding, sparqlVars)`
Ensures all field references exist in SPARQL results.

**Parameters:**
- `encoding`: The validated encoding
- `sparqlVars`: Array of variable names from SPARQL query

**Throws:** Error if any field reference not found.

#### `mergeEncoding(userEncoding)`
Merges user encoding with visualization defaults.

**Returns:** Complete encoding with all defaults applied.

#### `getDefaultEncoding()`
Returns the default encoding for this visualization type.

**Returns:** Default encoding object.

## Legend Configuration

Visual legends are automatically created for encoded channels:

```js
color: {
  field: 'category',
  legend: {
    title: 'Category',
    position: 'bottom',      // 'top', 'bottom', 'left', 'right'
    display: true
  }
}
```

If legend is not specified but color is field-mapped, default legend is created.

## Tooltip Configuration

Tooltips show data values on mark hover:

```js
bars: {
  tooltip: {
    title: 'Sales Data',           // Optional constant title
    fields: ['month', 'revenue']   // Query field names to show
  }
}
```

If tooltip.fields is omitted, all SPARQL variables are shown.

## Related Packages

- [@wimmics/venus-core](../core) - Shared types (VIS_TYPES, MARK_TYPES)
- [@wimmics/venus-rendering](../rendering) - Uses merged encodings for rendering
- [@wimmics/venus-visual-mapping](../visual-mapping) - Compiles encodings to visual artifacts
- [@wimmics/venus-transform](../transform) - Accesses encoding for data mapping

## See Also

- [Full Visualization Documentation](https://wimmics.github.io/venus/)
- [Encoding Specification Reference](https://wimmics.github.io/venus/docs/encoding/)

## License

See LICENSE in the repository root.
    enabled: true,
    drag: true,
    zoom: true,
    tooltip: true
  },
  nodes: {
    source: { field: "species" },
    target: { field: "family" },
    tooltip: { fields: ["personLabel", "birthYear"] },
    labels: { display: true },
    stroke: { value: "#ffffff", width: 1.5, display: true },
    color: {
      field: "speciesLabel",
      value: "#cccccc",
      scale: { type: "ordinal", range: "Set3" },
      legend: { title: "Species", position: "left", display: true }
    },
    size: {
      field: "articleCount",
      value: 8,
      scale: { type: "sqrt", range: [5, 20] },
      legend: { title: "Article Count", position: "right", display: true }
    }
  },
  links: {
    type: "directional",
    tooltip: { fields: ["type"] },
    color: {
      field: "type",
      value: "#999",
      scale: { type: "ordinal", range: ["#999", "#f66"] }
    }
  }
};
```

`interactions` controls graph interactions:
- `enabled`: `true | false` global interaction switch (default `true`)
- `drag`: enable/disable node drag and drop (default `true`)
- `zoom`: enable/disable pan and zoom (default `true`)
- `tooltip`: `true | false` global tooltip toggle (default `true`)

Tooltip field selection is now defined at mark level:
- `*.tooltip.title`: optional constant title or `{ field }` title for mark tooltips.
- `nodes.tooltip.fields`: optional array of query variable names to display for node tooltips.
- `links.tooltip.fields`: optional array of query variable names to display for link tooltips.
- If omitted or empty, tooltip shows SPARQL/query-derived fields (and excludes rendering/simulation internals).

Node identity fields depend on the graph construction mode:
- Directional and semantic graphs use `nodes.source.field` and `nodes.target.field`.
- Co-occurrence graphs use `nodes.field` as a string or an array of peer node fields.

Node color and size can be data-driven from either query-derived node fields or graph metrics:
- `nodes.color.field` / `nodes.size.field`: use a field copied from the SPARQL results.
- `nodes.color.metric` / `nodes.size.metric`: use a transformed graph metric. The supported metric is currently `"degree"`, the number of links connected to a node.
- Metrics and fields are mutually exclusive on a single color or size encoding. Metric color uses a quantitative or sequential color scale, for example `{ metric: "degree", scale: { type: "sequential", range: "Viridis" } }`.

`links.type` controls link construction:
- `"directional"` creates source-target links from `nodes.source.field` to `nodes.target.field`.
- `"semantic"` uses the same endpoints and `links.relation.field` for the relation field.
- `"cooccurrence"` connects `nodes.field` values that share `links.context.field`.
If `nodes.field` contains multiple entries in co-occurrence mode, all those fields are considered as node identities.

`labels` configures mark label text:
- `value`: constant label text
- `field`: data field used as label text

`nodes.labels`, `nodes.source.labels`, and `nodes.target.labels` also control visible node labels:
- `display`: `true | false` (default `true`)

`nodes.stroke`, `nodes.source.stroke`, and `nodes.target.stroke` control node outline style:
- `value`: CSS color string (name or hex), for example `"white"` or `"#ffffff"` (default `"#ffffff"`)
- `width`: stroke width as a number (`2`) or CSS-like pixel string (`"2px"`) (default `1.5`)
- `display`: `true | false` (default `true`)

`links` style options:
- `distance`: preferred simulation link distance (number, default `100`)
- `width.value`: constant link stroke width (number, default `1.5`)

`links.color` options:
- `value`: constant link color fallback (default `"#999"`)
- `field` (+ optional `scale`): data-driven link coloring. When `scale` is omitted, default palette is `Accent`, and legend is displayed by default.

## Bar-Chart Example
```js
bar.encoding = {
  x: {
    field: "name",
    axis: {
      labelAngle: -45,
      labelOffset: { x: -6, y: 10 }
    }
  },
  y: {
    field: "languageCount",
    axis: {
      tickFormat: "integer",
      tickStep: 1,
      labelOffset: { x: -4, y: 0 }
    },
    scale: { type: "count" }
  },
  bars: {
    groups: { field: "language" },
    stack: false,
    color: {
      field: "language",
      value: "#cccccc",
      scale: { type: "ordinal", range: "Set1" },
      legend: { title: "Language", position: "top-right", display: true }
    }
  },
  direction: "vertical"
};
```

`direction`:
- `"vertical"` (default)
- `"horizontal"`

`bars.stack`:
- `false` (default): no stacking
- `true`: stacked bar chart
- `"normalize"`: normalized stacked bar chart (100%)

`bars.groups.field`:
- optional grouping field used to split each category into multiple bars/segments
- required if you want grouped bars with `bars.stack: false`
- stacking (`bars.stack: true` / `"normalize"`) does not require `bars.groups.field`

`x.axis` options:
- `title`: optional object
  - `value`: title text (if `title` exists, this value is used instead of fallback)
  - `display`: boolean, default `true`; set `false` to hide the axis title entirely
- `labelAngle`: number
- `labelOffset`: `{ x: number, y: number }`

`y.axis` options:
- `title`: optional object
  - `value`: title text (if `title` exists, this value is used instead of fallback)
  - `display`: boolean, default `true`; set `false` to hide the axis title entirely
- `labelOffset`: `{ x: number, y: number }`
- `tickStep`: positive number (for example `1` for count data)
- `tickFormat`: preset string, one of:
  - `"raw"` (default, comma separated)
  - `"integer"` / `"int"` (rounded integers with separators)
  - `"percent"` / `"percentage"` (best used with `bars.stack: "normalize"`)
  - `"compact"` (Intl compact notation)
  - `"kmb"` (`k`, `M`, `B`, `T`)
  - `"k"` / `"thousands"`
  - `"m"` / `"millions"`
  - `"b"` / `"billions"`

## Scale Types
- Ordinal-like: `ordinal`
- Quantitative-like: `linear`, `sqrt`, `log`, `pow`, `count`, `quantitative`, `sequential`

For quantitative scales, domains are numeric extents. For ordinal scales, domains are unique values.
For bar charts, `y.scale.type: "count"` behaves like a linear scale with integer-oriented defaults (`tickFormat: "integer"` and step `1` if not provided).

### Domain Rules
- If `scale.domain` is missing, domain is auto-computed from data.
- If `scale.domain` is invalid/incomplete, it is corrected/completed with warnings.
- For quantitative domains, values are converted to numbers.
- For log scales, non-positive domains are corrected to positive extents.

### Range Rules
Color `scale.range` can be:
- Array of colors.
- D3 scheme name like `"Set3"` or `"Blues[5]"`.
- Not a single literal color (for example `"red"` or `["red"]`).
- For constant color, use `color.value` and omit `color.scale`.

Size `scale.range` is normalized:
- Quantitative scales expect numeric `[min, max]`.
- Ordinal scales accept a list of numeric sizes.
- Invalid ranges fall back to adaptive defaults.

### Quantitative Binning
Works for quantitative scales only. Configure with `scale.binning`.

Supported options:
- `method`: `"jenks"` or `"quartiles"`
- `bins`: positive integer
- `breaks`: explicit break values (numeric)
- `min` and `max`: explicit clipping bounds for binning extent

Defaults:
- `method: "jenks"`
- `bins: 5`

How it works with `domain` and `breaks`:
- `scale.domain` controls the numeric extent used by the scale (`[min, max]`).
- `scale.binning.breaks` defines explicit internal thresholds (bin boundaries).
- If `breaks` is provided, it overrides automatic threshold computation (`method`/`bins`).
- If `breaks` is not provided, thresholds are computed from data using `method` + `bins`.
- `binning.min` / `binning.max` can clip the effective extent used for binning.
- Threshold values outside the effective extent are ignored with warnings.

When binning is active, threshold scales (`d3.scaleThreshold`) are created for color and size.

Example 1: automatic thresholds from method + bins
```js
size: {
  field: "articleCount",
  scale: {
    type: "sqrt",
    range: [5, 20],
    binning: { method: "jenks", bins: 5 }
  }
}
```

Example 2: explicit domain + automatic quartile thresholds
```js
color: {
  field: "articleCount",
  scale: {
    type: "linear",
    domain: [40, 220],
    range: "Blues",
    binning: { method: "quartiles", bins: 5 }
  }
}
```

Example 3: explicit breaks (manual thresholds)
```js
size: {
  field: "articleCount",
  scale: {
    type: "sqrt",
    range: [4, 20],
    binning: { breaks: [60, 90, 130, 190] }
  }
}
```

### Priority rules

- `color.scale` has priority for data-driven coloring.
- If `color.scale` is omitted, `color.value` is used as a constant color.
- Color/size are applied only when the datum has the configured `field`.
- If a datum does not have that field (or scale mapping cannot be applied), renderer uses fallback values:
  - Node color fallback: `color.value` or `#cccccc`.
  - Node size fallback: `size.value` or `10`.
  - Link color fallback: `color.value` or `#999`.

## Legend Options
Use `legend` inside `color` or `size`:
- `legend.title`: custom title 
- `legend.position`: `left | right | top | bottom` (also supports corner variants: `top-left, bottom-right`, etc.) 
- `legend.display`: `true | false` 
- `legend.compact`: `true | false`
  - `true` (default): legend is compact/collapsible (starts collapsed)
  - `false`: legend is always expanded and reserves rendering space

Defaults:
- `display: true`
- `position: "bottom"`
- `title: <field name>`
- `compact: true`

Notes:
- For top legend positions (`top`, `top-left`, `top-right`), placement accounts for chart `title` when present.

## Public Exports
- `createEncodingManager`
- `DomainCalculator`
- `ColorScaleCalculator`
- `SizeRangeCalculator`
- `BinBreaksCalculator`

## Internal Files
- `src/utils/compute-domain.js`
- `src/utils/build-color-range.js`
- `src/utils/build-size-range.js`
- `src/utils/build-bin-breaks.js`
- `src/force-graph-encoding-manager.js`
- `src/bar-chart-encoding-manager.js`
- `src/force-graph-visual-artifacts.js`
- `src/bar-chart-visual-artifacts.js`

## Package Relationships
- Depends on `@wimmics/venus-core` for logging.
- Used by:
- `@wimmics/venus-components`
- `@wimmics/venus-rendering`
- `@wimmics/venus-import`
- `@wimmics/venus-transform`
