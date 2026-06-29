# Nodes

The `nodes` property defines and customizes node marks in `<venus-graph>`.

```js
encoding: {
  nodes: {
    color: { value: "#69b3a2" },
    source: {
      field: "source",
      labels: { field: "sourceLabel", display: false }
    },
    target: {
      field: "target",
      color: { field: "targetType" },
      stroke: { value: "#0f766e", width: 2 }
    },
    size: { field: "value" },
    labels: { field: "name", display: true },
    stroke: { value: "#fff", width: 1.5, display: true },
    tooltip: { fields: ["label", "value"] }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `color` | `object` | Node color config. Possible values: `value`, `field`, `metric`, `scale`, `legend`. <br>See [`color`](../color.md) for details. |
| `field` | `string` / `string[]` | Node identity field or fields for co-occurrence graphs. |
| `source.field` | `string` | Source node identity field for directional and semantic graphs. |
| `target.field` | `string` | Target node identity field for directional and semantic graphs. |
| `source.color` / `target.color` | `object` | Role-specific color config. Falls back to `nodes.color` when omitted. <br>See [`color`](../color.md) for details. |
| `source.size` / `target.size` | `object` | Role-specific node size config. Falls back to `nodes.size` when omitted. |
| `source.labels` / `target.labels` | `object` | Role-specific label text and visible label display config. Falls back to `nodes.labels` when omitted. |
| `source.stroke` / `target.stroke` | `object` | Role-specific node outline style. Falls back to `nodes.stroke` when omitted. |
| `source.tooltip` / `target.tooltip` | `object` | Role-specific tooltip title and fields. Falls back to `nodes.tooltip` when omitted. |
| `size` | `object` | Node size config. Possible values: `value`, `field`, `metric`, `scale`, `legend`. <br>See [`size`](../size.md) and [`scale`](../scale.md) for details. |
| `labels` | `object` | Node label text and visible label display config. Possible values: `display`, `value`, `field`. <br>See [`labels`](../labels.md) for details. |
| `stroke` | `object` | Node outline style. Possible values: `value` (CSS color), `width` (number/string), `display` (boolean). <br>**Default:** `{ value: "#ffffff", width: 1.5, display: true }`. |
| `tooltip.title` | `string` / `object` | Optional tooltip title as a constant string or `{ field }`. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered nodes. If omitted, fields are selected automatically. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../interactions.md). |

## Force-Graph Metric Sizing

For `<venus-graph>`, node size supports metric-based mapping with `"degree"`:

- `nodes.size.metric: "degree"`
- `nodes.source.size.metric: "degree"`
- `nodes.target.size.metric: "degree"`

Rules:

- `metric` and `field` are mutually exclusive in one size config.
- `"degree"` maps each node to its number of connected links.

Example:

```js
nodes: {
  source: { field: "actorName" },
  target: { field: "movieName" },
  size: {
    metric: "degree",
    scale: { type: "linear", range: [5, 25] },
    legend: { title: "Links Count" }
  }
}
```

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
`color`, `size`, `labels`, `stroke`, and `tooltip` config to
that role.
Role-specific fields are copied only to nodes built from that role. When the
same entity appears as both a source and a target, VENUS uses general `nodes`
config for that node.

## Sankey-Specific Properties

For `<venus-sankey>`, `nodes` also controls stage construction and stage-level ordering.

| Property | Type | Description |
|---|---|---|
| `fields` | `Array<string|object>` | Ordered Sankey stage definitions. Must contain at least two entries. String entries are interpreted as `{ field: "..." }`. |
| `fields[i].field` | `string` | SPARQL variable used as stage `i` node identity. |
| `fields[i].title` | `string` | Optional display title used for the stage column label. |
| `fields[i].color` | `object` | Optional stage-specific color config, applied only to stage `i` nodes. |
| `fields[i].sort` | `string` / `object` | Optional stage-specific sort override for node ordering inside stage `i`. |
| `sort` | `string` / `object` | Global fallback sort for all stages that do not define `fields[i].sort`. |
| `align` | `string` | Stage alignment strategy. Allowed values: `justify`, `left`, `right`, `center`. |
| `padding` | `number` | Node vertical spacing inside each stage. Must be a non-negative number. |
| `size.value` | `number` | Node rectangle width in pixels. |

### Sankey Sort Values

Both `nodes.sort` and `nodes.fields[i].sort` support:

- String shorthand: `"layout"`, `"alpha"`, `"count"`, `"value"`
- Object form:

```js
{
  by: "layout|alpha|count|value",
  order: "asc|desc",        // optional
  mode: "total|in|out"      // optional; only valid for by=count or by=value
}
```

Sort precedence:

1. `nodes.fields[i].sort` (stage override)
2. `nodes.sort` (global fallback)
3. Layout ordering when no explicit sort is provided

Example:

```js
nodes: {
  sort: "layout",
  fields: [
    { field: "affiliation", sort: "alpha" },
    { field: "country", sort: { by: "value", mode: "total", order: "desc" } },
    "city"
  ]
}
```
