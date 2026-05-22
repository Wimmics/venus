# Lines

The `lines` property configures line marks in `<venus-linechart>`.

Use `lines.group.field` to define how many lines are drawn (one line per distinct value), independently from `lines.color.field`.

```js
encoding: {
  lines: {
    label: { field: "countryLabel" },
    group: { field: "countryLabel" },
    color: {
      field: "continentLabel",
      scale: { type: "ordinal", range: "Accent" },
      legend: { display: true }
    },
    size: {
      value: 2
    },
    tooltip: { fields: ["countryLabel", "continentLabel", "birthRate"] }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `label` | `string` / `object` | Line label text as a constant or field. <br>See [`label`](../label.md) for details. |
| `group.field` | `string` | Field used to create one line per distinct value (series grouping key). This can differ from `color.field`. <br>**Default:** not set. Backward compatibility fallback: `color.field` is used as grouping key when `group.field` is omitted. |
| `color` | `object` | Line color config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`color`](../color.md) for details. |
| `size` | `object` | Line stroke width config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`size`](../size.md) and [`scale`](../scale.md) for details. |
| `tooltip.title` | `string` / `object` | Optional tooltip title as a constant string or `{ field }`. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered line marks/series. If omitted, fields are selected automatically. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../interactions.md). |
