# Size Channel

The `size` property controls mark dimensions, either with a constant value, a field mapping, or (for supported marks) a metric mapping.

```js
encoding: {
  points: {
    size: {
      field: "population",
      scale: { type: "linear", range: [4, 18] },
      legend: { title: "Population", display: true }
    }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `value` | `number` | Constant size value for the mark. |
| `field` | `string` | Data key used for size mapping. |
| `metric` | `string` | Transformed-data metric used for size mapping when supported. Graph nodes support `"degree"`. |
| `scale` | `object` | Scale config for size mapping. See [`scale`](./scale.md). |
| `legend` | `object` | Legend options for size mapping. See [`legend`](./legend.md). |

## Supported Metric

`metric` is currently supported for force-directed graph nodes:

- `nodes.size.metric: "degree"`
- `nodes.source.size.metric: "degree"`
- `nodes.target.size.metric: "degree"`

Rules:

- `metric` and `field` are mutually exclusive on the same size channel.
- `"degree"` is the node link-count metric.

Example:

```js
encoding: {
  nodes: {
    source: { field: "actorName" },
    target: { field: "movieName" },
    size: {
      metric: "degree",
      scale: { type: "linear", range: [5, 25] },
      legend: { title: "Links Count" }
    }
  },
  links: { type: "directional" }
}
```

## Notes

- Size support depends on the mark type. See mark-specific pages in [`marks`](./marks/nodes.md).
- For Sankey, node width is configured with `nodes.size.value`.
