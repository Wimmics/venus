# Cartesian visualizations

Cartesian visualizations represent data using positional encodings along orthogonal axes (typically **x** and **y**). They map variables to spatial coordinates to support quantitative comparison, trend analysis, and distribution assessment.

These techniques emphasize magnitude, ordering, and variation across dimensions rather than structural relationships. They are particularly appropriate when the analytical task focuses on comparing values, identifying trends, or examining distributions.

## When to Use

Cartesian visualizations are appropriate when:

- Quantitative comparison between values is required.
- Trends over an ordered dimension (e.g., time) must be analyzed.
- Distributions or rankings need to be examined.
- Relationships between numerical variables should be assessed.

## Layout

All cartesian charts share a common layout defined via `x` and `y` properties of the encoding. The `x` property defines the horizontal position channel, while the `y` property defines the vertical position channel. 

```js
encoding: {
  x: {
    field: "country",
    axis: { labelAngle: -30 }
  },
  y: {
    field: "count",
    axis: { tickFormat: "integer", tickStep: 1 }
  }
}
```

Both channels expose the following properties:

| Property | Type | Description |
|---|---|---|
| `field` | `string` | Field used for positioning. Possible values: numeric/value key from data rows. <br>**Default:** none (required). |
| `axis` | `object` | Axis options. Possible values: `tickFormat`, `tickStep`, `labelOffset`, and related axis settings. |
| `scale` | `object` | Scale options. Possible values: `type`, optional `domain`, optional `range`. <br>See [`scale`](../scale.md) for details. |

### Axes customization

The `axis` property customizes tick and label rendering.

```js
encoding: {
  x: {
    field: "country",
    axis: {
      labelAngle: -45,
      labelOffset: { x: -6, y: 10 }
    }
  },
  y: {
    field: "languageCount",
    axis: {
      tickStep: 1,
      tickFormat: "integer",
      labelOffset: { x: -4, y: 0 }
    }
  }
}
```

It exposes the following properties:

| Property | Type | Description |
|---|---|---|
| `labelAngle` | `number` | Rotation angle for x labels. Possible values: any number (commonly negative for slanted labels). <br>**Default:** `0`. |
| `labelOffset` | `{ x: number, y: number }` | Pixel offset for x labels. Possible values: object with numeric `x` and `y`. <br>**Default:** `{ x: 0, y: 0 }`. |
| `tickStep` | `number` | Tick interval spacing. Possible values: positive numbers. <br>**Default:** auto (or `1` for count-style scales). |
| `tickFormat` | `string` | Tick label formatter. Possible values: `raw`, `integer`, `percent`, `compact`, `kmb`, `k`, `m`, `b`. <br>**Default:** `raw` (or `percent` for normalized stack). |

**Typical Usage**

- Long category names: set `x.axis.labelAngle` to `-30` or `-45`.
- Count metrics: set `y.axis.tickFormat` to `"integer"` and `tickStep` to `1`.
- Percent charts: use `bars.stack: "normalize"` and `tickFormat: "percent"`.


## Included Techniques

VENUS currently supports the following Cartesian visualization techniques:

- **Bar chart ([`venus-barchart`](./venus-barchart.md)):** Compares discrete categories using rectangular marks whose length encodes magnitude.

- **Line chart ([`venus-linechart`](./venus-linechart.md)):**: Displays trends across an ordered or continuous dimension.

- **Scatter plot ([`venus-scatterplot`](./venus-scatterplot.md)):** Shows relationships between two quantitative variables.
