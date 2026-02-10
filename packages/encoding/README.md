# @wimmics/kgnovis-encoding

Encoding engine that turns user encoding into validated domains and D3-ready scales.

## What This Package Does
- Resolves visualization-specific encoding for force graph and bar chart.
- Computes or validates domains from data (`DomainCalculator`).
- Builds color ranges/palettes (`ColorScaleCalculator`).
- Normalizes size ranges (`SizeRangeCalculator`).
- Computes bin breaks for quantitative binning (`BinBreaksCalculator`).
- Creates and caches D3 scales in the encoding manager.

## Encoding Model
- Force graph: `nodes` / `links` channels (`color`, `size`, `stroke`, `labels`, `interactions`).
- Bar chart: `x`, `y`, `color`, `direction`.

## Force-Graph Example
```js
graph.encoding = {
  interactions: { enabled: true, drag: true, zoom: true },
  nodes: {
    field: ["species", "family"],
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
    field: { source: "species", target: "family" },
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

`nodes.field` accepts:
- A string (for example `"species"`)
- An array of strings (for example `["species"]` or `["species", "family"]`)

`links.field` controls link construction:
- Object `{ source, target }`: directional links from source to target.
- String (data field name): co-occurrence mode.
In co-occurrence mode, nodes are connected when they share the same resolved value of `links.field`. If `nodes.field` contains multiple entries, all those fields are considered as node identities for co-occurrence.

`nodes.labels` controls node text labels:
- `display`: `true | false` (default `true`)

`nodes.stroke` controls node outline style:
- `value`: CSS color string (name or hex), for example `"white"` or `"#ffffff"` (default `"#ffffff"`)
- `width`: stroke width as a number (`2`) or CSS-like pixel string (`"2px"`) (default `1.5`)
- `display`: `true | false` (default `true`)

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
    field: "population",
    axis: {
      tickFormat: "kmb",
      labelOffset: { x: -4, y: 0 }
    },
    scale: { type: "pow", exponent: 0.5 }
  },
  color: {
    field: "language",
    value: "#cccccc",
    scale: { type: "ordinal", range: "Set1" },
    legend: { title: "Language", position: "top-right", display: true }
  },
  direction: "vertical"
};
```

`direction`:
- `"vertical"` (default)
- `"horizontal"`

`x.axis` options:
- `labelAngle`: number
- `labelOffset`: `{ x: number, y: number }`

`y.axis` options:
- `labelOffset`: `{ x: number, y: number }`
- `tickFormat`: preset string, one of:
- `"raw"` (default, comma separated)
- `"compact"` (Intl compact notation)
- `"kmb"` (`k`, `M`, `B`, `T`)
- `"k"` / `"thousands"`
- `"m"` / `"millions"`
- `"b"` / `"billions"`

## Scale Types
- Ordinal-like: `ordinal`
- Quantitative-like: `linear`, `sqrt`, `log`, `quantitative`, `sequential`

For quantitative scales, domains are numeric extents. For ordinal scales, domains are unique values.

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

Defaults:
- `display: true`
- `position: "bottom"`
- `title: <field name>`

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
- Depends on `@wimmics/kgnovis-core` for logging.
- Used by:
- `@wimmics/kgnovis-components`
- `@wimmics/kgnovis-d3renderer`
- `@wimmics/kgnovis-datasource`
- `@wimmics/kgnovis-mappers`
