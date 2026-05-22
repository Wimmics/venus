# Bars

The `bars` property configures bar marks in `<venus-barchart>`.

`groups` and `stack` are mark-level: use `bars.groups.field` and `bars.stack`.

```js
encoding: {
  bars: {
    label: { field: "genre" },
    groups: { field: "genre" },
    stack: false,
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
| `label` | `string` / `object` | Bar label text as a constant or field. <br>See [`label`](../label.md) for details. |
| `groups.field` | `string` | Field used to split each x-category into grouped sub-categories when `bars.stack: false`. <br>**Default:** not set (simple non-grouped bars). |
| `stack` | `string`/`boolean` | Stacking mode. Possible values: `false`, `true`, `"normalize"`. <br>**Default:** `false`. |
| `color` | `object` | Bar color config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`color`](../color.md) for details. |
| `size` | `object` | Bar thickness/size config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`size`](../size.md) and [`scale`](../scale.md) for details. |
| `tooltip.title` | `string` / `object` | Optional tooltip title as a constant string or `{ field }`. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered bars. If omitted, fields are selected automatically. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../interactions.md). |
