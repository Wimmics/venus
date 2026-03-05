# Y Axis

The `y` property defines the vertical position channel in cartesian visualizations.

```js
encoding: {
  y: {
    field: "count",
    axis: { tickFormat: "integer", tickStep: 1 }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `field` | `string` | Field used for y positioning. Possible values: numeric/value key from data rows. <br>**Default:** none (required). |
| `axis` | `object` | Y-axis options. Possible values: `tickFormat`, `tickStep`, `labelOffset`, and related axis settings. <br>See [`axis`](./axis.md) for details. |
| `scale` | `object` | Y-scale options. Possible values: `type`, optional `domain`, optional `range`. <br>See [`scale`](../scale.md) for details. |
