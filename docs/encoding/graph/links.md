# Links

The `links` property configures how entities are related within a graph structure. 

```js
encoding: {
  links: {
    field: { source: "a", target: "b" },
    color: { value: "#999" },
    distance: 100
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `field` | `string`<br>`{ source: string, target: string }` | Link construction model. Uses field names from the SPARQL query to generate links either by co-occurrence within result objects (when a single field is provided) or by explicit source–target mapping to create directed links between two fields. <br>**Default:** none (required for graph links). |
| `color` | `object` | Link color configuration. Supported properties: `value`, `field`, `scale`. <br>See [`color`](../color.md) for details. |
| `distance` | `number` | Preferred force-link distance. Must be a positive number. <br>**Default:** `100`. |
<!-- | `width.value` | `number` | Constant link thickness. Must be a positive number. <br>**Default:** `1.5`. | -->

