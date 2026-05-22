# Nodes

The `nodes` property defines and customizes node marks in `<venus-graph>`.

```js
encoding: {
  nodes: {
    color: { value: "#69b3a2" },
    source: {
      field: "source",
      label: { field: "sourceLabel" }
    },
    target: {
      field: "target",
      color: { field: "targetType" }
    },
    size: { field: "value" },
    label: { field: "name" },
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
| `field` | `string` / `string[]` | Node identity field or fields for co-occurrence graphs. |
| `source.field` | `string` | Source node identity field for directional and semantic graphs. |
| `target.field` | `string` | Target node identity field for directional and semantic graphs. |
| `source.color` / `target.color` | `object` | Role-specific color config. Falls back to `nodes.color` when omitted. <br>See [`color`](../encoding/color.md) for details. |
| `source.size` / `target.size` | `object` | Role-specific node size config. Falls back to `nodes.size` when omitted. |
| `source.label` / `target.label` | `string` / `object` | Role-specific label text or label field. Falls back to `nodes.label` when omitted. |
| `source.tooltip` / `target.tooltip` | `object` | Role-specific tooltip title and fields. Falls back to `nodes.tooltip` when omitted. |
| `size` | `object` | Node size config. Possible values: `value`, `field`, `scale`, `legend`. <br>See [`size`](../encoding/size.md) and [`scale`](../encoding/scale.md) for details. |
| `label` | `string` / `object` | Node label text as a constant or field. <br>See [`label`](../label.md) for details. |
| `labels` | `object` | Node label display config. Possible values: `display`. <br>See [`labels`](../labels.md) for details. |
| `stroke` | `object` | Node outline style. Possible values: `value` (CSS color), `width` (number/string), `display` (boolean). <br>**Default:** `{ value: "#ffffff", width: 1.5, display: true }`. |
| `tooltip.title` | `string` / `object` | Optional tooltip title as a constant string or `{ field }`. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered nodes. If omitted, fields are selected automatically. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../encoding/interactions.md). |

## Source And Target Roles

Directional and semantic source-target graphs may configure source and target
nodes independently:

```js
encoding: {
  nodes: {
    source: {
      field: "actorName",
      color: { value: "#69b3a2" }
    },
    target: {
      field: "movieName",
      color: {
        field: "distributorName",
        scale: { type: "ordinal", range: "Set3" }
      }
    }
  },
  links: {
    type: "directional"
  }
}
```

`nodes.source` and `nodes.target` define endpoint fields and may scope
data-driven `color`, `size`, `label`, and `tooltip` config to that role.
Role-specific fields are copied only to nodes built from that role. When the
same entity appears as both a source and a target, VENUS uses general `nodes`
config for that node.
