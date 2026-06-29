# Links

The `links` property configures link marks and relationship construction in `<venus-graph>`.

```js
encoding: {
  links: {
    type: "semantic",
    relation: { field: "relationship" },
    labels: { field: "relationshipName" },
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
| `labels` | `object` | Link label text as a constant value or field. <br>See [`labels`](../labels.md) for details. |
| `color` | `object` | Link color configuration. Supported properties: `value`, `field`, `scale`, `legend`. <br>See [`color`](../color.md) for details. |
| `distance.value` | `number` | Preferred force-link distance. Must be a positive number. <br>**Default:** `100`. |
| `tooltip.title` | `string` / `object` | Optional tooltip title as a constant string or `{ field }`. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered links. These fields control the detail rows below `tooltip.title`. If omitted, fields are selected automatically. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../interactions.md). |

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

For directional links, both `nodes.source.field` and `nodes.target.field` are required.

Semantic links use the same endpoint shape and add a relation field:

```js
links: {
  type: "semantic",
  relation: { field: "predicate" }
}
```

For semantic links, `links.relation.field` is required in addition to source-target endpoint fields.

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

For co-occurrence links, both `nodes.field` and `links.context.field` are required.

Co-occurrence links aggregate result bindings. Query values from the rows that
create each link stay available for link tooltips: a field with one unique value
stays scalar, and a field with several unique values becomes an array.

## Sankey-Specific Properties

For `<venus-sankey>`, links are automatically built between consecutive `nodes.fields` stages.

| Property | Type | Description |
|---|---|---|
| `value.field` | `string` | Numeric SPARQL variable used to increment link magnitude. If omitted or non-numeric on a row, the row contributes `1`. |
| `color` | `object` | Link color config (`value`, `field`, `scale`, `legend`). |
| `opacity.value` | `number` | Constant link opacity. Must be between `0` and `1`. |
| `labels` | `object` | Link label text/display config. |
| `tooltip.title` | `string` / `object` | Optional tooltip title as a constant string or `{ field }`. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered links. |

Notes for Sankey:

- `links.type`, `links.relation`, and `links.context` are not used.
- Aggregated link values are exposed in tooltip data under `value.field` when provided.
