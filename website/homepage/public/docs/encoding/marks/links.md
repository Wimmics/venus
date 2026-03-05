# Links

The `links` property configures link marks and relationship construction in `<venus-graph>`.

```js
encoding: {
  links: {
    field: { source: "a", target: "b" },
    color: { value: "#999" },
    distance: 100,
    tooltip: { fields: ["type"] }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `field` | `string`<br>`{ source: string, target: string }` | Link construction model. Uses query field names to generate links by co-occurrence (single field) or explicit source-target mapping (object). <br>**Default:** none (required for graph links). |
| `color` | `object` | Link color configuration. Supported properties: `value`, `field`, `scale`, `legend`. <br>See [`color`](../encoding/color.md) for details. |
| `distance` | `number` | Preferred force-link distance. Must be a positive number. <br>**Default:** `100`. |
| `width.value` | `number` | Constant link thickness. Must be a positive number. <br>**Default:** `1.5`. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered links. If omitted, link tooltip falls back to automatic/default behavior. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../encoding/interactions.md). |
