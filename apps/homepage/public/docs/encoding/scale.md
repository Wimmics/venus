# Scale Types

The `scale` property defines how raw data values are converted into
visual channels such as color and size.

``` js
encoding: {
  nodes: {
    color: {
      field: "speciesLabel",
      scale: { type: "ordinal", range: "Set3" }
    },
    size: {
      field: "articleCount",
      scale: { type: "sqrt", range: [5, 20] }
    }
  }
}
```

## Common Properties

These properties apply to all scale types.

| Property | Type | Description |
|---|---|---|
| `type` | `string` | Scale algorithm. Possible values: `ordinal`, `linear`, `sqrt`, `log`, `pow`, `count`, `quantitative`, `sequential`.<br>**Default:** channel-dependent (usually auto). |
| `domain` | `array` | Input extent or categories for mapping. Possible values: numeric pair (`[min, max]`) or categorical value list.<br>**Default:** auto-computed from data. |
| `range` | `array` / `string` | Output visual range. Interpretation depends on the visual channel (see below).<br>**Default:** adaptive range from renderer. |
| `binning.method` | `string` | Automatic threshold method. Possible values: `jenks`, `quartiles`.<br>**Default:** `jenks`. |
| `binning.bins` | `number` | Number of bins for auto-thresholding. Must be a positive integer.<br>**Default:** `5`. |
| `binning.breaks` | `number[]` | Manual bin boundaries in ascending order.<br>**Default:** none (auto method used). |


## Color Scales

When used with the **color** channel, `range` defines a color palette. When the `scale.range` is used with the **color** channel, it may reference either a custom color array or a named color palette. VENUS supports the same palette naming conventions popularized by D3 and ColorBrewer, enabling concise and familiar color configuration.

Most built-in palettes originate from ColorBrewer and are compatible with common visualization practices.

### Usage

You can specify the color range in three ways: 

- **Named palette**

```js
scale: { type: "ordinal", range: "Set3" }
```
- **Named palette with fixed number of colors**

```js
scale: { range: "Reds[5]" }
```

- **Custom color array**

```js
scale: { range: ["#ff0000", "#00ff00", "#0000ff"] }
```

### Resolution Rules

VENUS automatically interprets pallete strings:

- `PaletteName` → mapped to the appropriate D3 palette  
  - categorical: `schemePaletteName`  
  - continuous: `interpolatePaletteName`

- `PaletteName[k]` → discrete palette with *k* colors (when supported)
- `string[]` → used directly as a custom palette


The design keeps the syntax compact while remaining compatible with [D3](https://d3js.org/d3-scale-chromatic) and [ColorBrewer](https://colorbrewer2.org) conventions. 

### Palette Types

#### Categorical (Discrete)

Used to distinguish nominal categories. Common palettes: 
- `Category10`
- `Accent`
- `Set3` 

See [D3 Scale Chromatic: Categorical Schemes](https://d3js.org/d3-scale-chromatic/categorical) for a complete list of available palettes.

Typical use:

```js
color: {
  field: "species",
  scale: { type: "ordinal", range: "Category10" }
}
```

With fixed steps:

```js
scale: { range: "Reds[5]" }
```

#### Sequential (Ordered)

Used for ordered or quantitative data. Common examples:

- `Blues`
- `Reds`
- `Viridis`

See [D3 Scale Chromatic: Sequential Schemes](https://d3js.org/d3-scale-chromatic/sequential) for a complete list of available palettes.

Typical use:

```js
color: {
  field: "population",
  scale: { type: "sequential", range: "Blues" }
}
```


#### Diverging (Centered)

Used when data has a meaningful midpoint. Common examples:

- `RedYlBu`
- `Spectral`
- `RdBu`

See [D3 Scale Chromatic: Diverging Schemes](https://d3js.org/d3-scale-chromatic/diverging) for a complete list of available palettes.

Typical use:

```js
scale: { type: "sequential", range: "RdYlBu" }
```

#### Cyclical

Used for periodic data. Common examples:

- `Rainbow`

See [D3 Scale Chromatic: Cyclical Schemes](https://d3js.org/d3-scale-chromatic/cyclical) for a complete list of available palettes.

```js
scale: { type: "sequential", range: "Rainbow" }
```

### Notes

- Sequential and diverging palettes are recommended for quantitative data.
- Categorical palettes are recommended for nominal data.
- If `range` is ommited, VENUS selects a default palette.
- Not all palttes support indexed forms (`[k]`); valid ranges depend on the underlying ColorBrewer definitions.


## Size Scales

When used with the **size** channel, `range` defines the numeric size
interval.

**Expected form**

``` js
range: [minSize, maxSize]
```

**Example**

``` js
size: {
  field: "articleCount",
  scale: { type: "sqrt", range: [5, 20] }
}
```

**Notes**

-   Values must be positive numbers.
-   `sqrt` is recommended for area-based marks.
-   If `range` is omitted, a default size range is applied.


## General Notes

-   Missing `domain` is automatically computed from data.
-   Invalid quantitative domains are corrected when possible.
-   For constant color or size, prefer using the channel `value` instead of a scale.
