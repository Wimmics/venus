# Links

The `links` property configures link marks and relationship construction in `<venus-graph>`.

```js
encoding: {
  links: {
    type: "semantic",
    relation: { field: "relationship" },
    label: { field: "relationshipName" },
    color: { value: "#999" },
    distance: 100,
    tooltip: { fields: ["type"] }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `type` | `string` | Link construction model. Possible values: `directional`, `semantic`, `cooccurrence`. <br>**Default:** `directional` for source-target graphs. |
| `relation.field` | `string` | Relation field for `semantic` source-target links. The endpoints are defined by `nodes.source.field` and `nodes.target.field`. |
| `context.field` | `string` | Shared context field for `cooccurrence` links. Nodes that share a context value are connected. |
| `label` | `string` / `object` | Link label text as a constant or field. <br>See [`label`](../label.md) for details. |
| `color` | `object` | Link color configuration. Supported properties: `value`, `field`, `scale`, `legend`. <br>See [`color`](../encoding/color.md) for details. |
| `distance` | `number` | Preferred force-link distance. Must be a positive number. <br>**Default:** `100`. |
| `width.value` | `number` | Constant link thickness. Must be a positive number. <br>**Default:** `1.5`. |
| `tooltip.title` | `string` / `object` | Optional tooltip title as a constant string or `{ field }`. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered links. These fields control the detail rows below `tooltip.title`. If omitted, fields are selected automatically. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../encoding/interactions.md). |

## Construction

Directional and semantic links use role-specific node endpoint fields:

```js
nodes: {
  source: { field: "person" },
  target: { field: "organization" }
},
links: {
  type: "directional"
}
```

Semantic links use the same endpoint shape and add a relation field:

```js
links: {
  type: "semantic",
  relation: { field: "predicate" }
}
```

Co-occurrence links use `nodes.field` for node identities and `context.field`
for the shared result field that connects them:

```js
nodes: {
  field: "actor"
},
links: {
  type: "cooccurrence",
  context: { field: "movie" }
}
```

Co-occurrence links aggregate result bindings. Query values from the rows that
create each link stay available for link tooltips: a field with one unique value
stays scalar, and a field with several unique values becomes an array.
