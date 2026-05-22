# Points

The `points` property configures point marks in Cartesian visualizations (for example scatter plots, and optional points on line charts).

```js
encoding: {
  points: {
    display: true,
    labels: { field: "countryLabel" },
    color: {
      field: "continentLabel",
      scale: { type: "ordinal", range: "Accent" },
      legend: { display: true }
    },
    size: {
      field: "population",
      scale: { type: "linear", range: [4, 18] },
      legend: { display: true }
    },
    tooltip: { fields: ["countryLabel", "population"] }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `display` | `boolean` | Point visibility. <br>**Default:** chart-specific (`true` for scatter, optional for line chart points). |
| `labels` | `object` | Point label text as a constant value or field. <br>See [`labels`](../labels.md) for details. |
| `color` | `object` | Point color config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`color`](../encoding/color.md) for details. |
| `size` | `object` | Point size config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`size`](../encoding/size.md) and [`scale`](../encoding/scale.md) for details. |
| `tooltip.title` | `string` / `object` | Optional tooltip title as a constant string or `{ field }`. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered points. If omitted, fields are selected automatically. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../encoding/interactions.md). |
