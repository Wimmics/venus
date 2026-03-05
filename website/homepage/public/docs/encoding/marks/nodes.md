# Nodes

The `nodes` property defines and customizes node marks in `<venus-graph>`.

```js
encoding: {
  nodes: {
    color: { field: "type" },
    size: { field: "value" },
    labels: { display: true },
    stroke: { value: "#fff", width: 1.5, display: true },
    tooltip: { fields: ["label", "value"] }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `color` | `object` | Node color config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`color`](../encoding/color.md) for details. |
| `size` | `object` | Node size config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`size`](../encoding/size.md) and [`scale`](../encoding/scale.md) for details. |
| `labels.display` | `boolean` | Node label visibility. Possible values: `true`, `false`. <br>**Default:** `true`. |
| `stroke` | `object` | Node outline style. Possible values: `value` (CSS color), `width` (number/string), `display` (boolean). <br>**Default:** `{ value: "#ffffff", width: 1.5, display: true }`. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered nodes. If omitted, fields are selected automatically. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../encoding/interactions.md). |
