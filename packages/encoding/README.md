# @wimmics/kgnovis-encoding

Encoding engine that turns user encoding into validated domains and D3-ready scales.

## What This Package Does
- Resolves force-graph encoding for nodes and links.
- Computes or validates domains from data (`DomainCalculator`).
- Builds color ranges/palettes (`ColorScaleCalculator`).
- Normalizes size ranges (`SizeRangeCalculator`).
- Computes bin breaks for quantitative binning (`BinBreaksCalculator`).
- Creates and caches D3 scales in the encoding manager.

## Current Encoding Model
- Each mark (`nodes`, `links`) can be associated to a `color` object and a `size` object.


## Minimal Usage
```js
graph.encoding = {
  nodes: {
    field: ["species", "family"],
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

## Package Relationships
- Depends on `@wimmics/kgnovis-core` for logging.
- Used by:
- `@wimmics/kgnovis-components`
- `@wimmics/kgnovis-renderer-d3`
- `@wimmics/kgnovis-datasource`
- `@wimmics/kgnovis-mappers`
