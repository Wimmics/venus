# User Interactions

The `interactions` property controls user interactions with the visualization. Interactions are enabled by default in all visualizations. To use the visualization as a simple static representation of the data, user interacgtions can be disabled, either globally or by type of interaction.

```js
encoding: {
  interactions: {
    enabled: true,
    drag: true,
    zoom: true,
    nodeDetailsPanel: true,
    tooltip: true
  },
  points: {
    tooltip: { fields: ["label", "count"] }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Global interaction toggle. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |
| `drag` | `boolean` | Enables mark dragging via click-and-drag. Available for network-based visualizations. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |
| `zoom` | `boolean` | Enables pan and zoom interactions. Zoom is controlled via scroll. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |
| `nodeDetailsPanel` | `boolean` | Enables the node details panel in graph visualizations to support on-demand URI metadata inspection. When enabled, the panel appears on right-click of a node. <br>**Possible values:** `true`, `false`. <br>**Default:** `false`. |
| `tooltip` | `boolean` | Global tooltip toggle. Tooltips display detailed information about the data record represented by a mark and appear on hover. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |

Tooltip fields are configured on each mark channel (for example `points.tooltip.fields`, `lines.tooltip.fields`, `bars.tooltip.fields`, `nodes.tooltip.fields`, `links.tooltip.fields`). If omitted, fields are selected automatically.
