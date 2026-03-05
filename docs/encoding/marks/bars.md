# Bars

The `bars` property configures bar marks in `<venus-barchart>`.

```js
encoding: {
  bars: {
    color: {
      field: "genre",
      scale: { type: "ordinal", range: "Set2" },
      legend: { display: true }
    },
    size: {
      value: 0
    },
    tooltip: { fields: ["genre", "movieCount"] }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `color` | `object` | Bar color config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`color`](../encoding/color.md) for details. |
| `size` | `object` | Bar thickness/size config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`size`](../encoding/size.md) and [`scale`](../encoding/scale.md) for details. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered bars. If omitted, fields are selected automatically. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../encoding/interactions.md). |
