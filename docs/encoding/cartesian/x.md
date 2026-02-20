# X Axis

The `x` property defines the horizontal position channel in cartesian visualizations.

```js
encoding: {
  x: {
    field: "country",
    axis: { labelAngle: -30 }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `field` | `string` | Field used for x positioning. Possible values: categorical/value key from data rows. <br>**Default:** none (required). |
| `axis` | `object` | X-axis options. Possible values: `labelAngle`, `labelOffset`, and related axis settings. <br>See [`axis`](./axis.md) for details. |
