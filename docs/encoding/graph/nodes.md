# Nodes

The `nodes` property defines and customizes the entities of a graph structure.

```js
encoding: {
  nodes: {
    color: { field: "type" },
    size: { field: "value" },
    labels: { display: true },
    stroke: { value: "#fff", width: 1.5, display: true }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `color` | `object` | Node color config. Possible values: `value`, `field`, `scale` and `legend`. <br>See [`color`](../color.md) for details. |
| `size` | `object` | Node size config. Possible values: `value`, `field`, `scale` and `legend`. <br>See [`size`](../size.md) for details. |
| `labels.display` | `boolean` | Node label visibility. Possible values: `true`, `false`. <br>**Default:** `true`. |
| `stroke` | `object` | Node outline style. Possible values: `value` (CSS color), `width` (number/string), `display` (boolean). <br>**Default:** `{ value: "#ffffff", width: 1.5, display: true }`. |
