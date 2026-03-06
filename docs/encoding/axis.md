# Axes

The `axis` property customizes tick and label rendering in Cartesian visualizations. It is used as a property of the `x` and `y` encodings.

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

## Properties

| Property | Type | Description |
|---|---|---|
| `labelAngle` | `number` | Rotation angle for x labels. Possible values: any number (commonly negative for slanted labels). <br>**Default:** `0`. |
| `labelOffset` | `{ x: number, y: number }` | Pixel offset for x labels. Possible values: object with numeric `x` and `y`. <br>**Default:** `{ x: 0, y: 0 }`. |
| `tickStep` | `number` | Tick interval spacing. Possible values: positive numbers. <br>**Default:** auto (or `1` for count-style scales). |
| `tickFormat` | `string` | Tick label formatter. Possible values: `raw`, `integer`, `percent`, `compact`, `kmb`, `k`, `m`, `b`. <br>**Default:** `raw` (or `percent` for normalized stack). |

## Typical usage

- Long category names: set `x.axis.labelAngle` to `-30` or `-45`.
- Count metrics: set `y.axis.tickFormat` to `"integer"` and `tickStep` to `1`.
- Percent charts: use `bars.stack: "normalize"` and `tickFormat: "percent"`.
