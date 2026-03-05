# Lines

The `lines` property configures line marks in `<venus-linechart>`.

```js
encoding: {
  lines: {
    color: {
      field: "series",
      scale: { type: "ordinal", range: "Accent" },
      legend: { display: true }
    },
    size: {
      value: 2
    },
    tooltip: { fields: ["series", "value"] }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `color` | `object` | Line color config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`color`](../encoding/color.md) for details. |
| `size` | `object` | Line stroke width config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`size`](../encoding/size.md) and [`scale`](../encoding/scale.md) for details. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered line marks/series. If omitted, fields are selected automatically. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../encoding/interactions.md). |
