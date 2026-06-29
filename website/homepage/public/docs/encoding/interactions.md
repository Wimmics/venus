# User Interactions

The `interactions` property controls user interactions with the visualization. Interactions are enabled by default in all visualizations. To use the visualization as a simple static representation of the data, user interactions can be disabled, either globally or by type of interaction.

```js
encoding: {
  interactions: {
    enabled: true,
    drag: true,
    zoom: true,
    nodeDetailsPanel: true,
    tooltip: true
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Global interaction toggle. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |
| `drag` | `boolean` | Enables mark dragging via click-and-drag. In practice, this applies to `<venus-graph>` node dragging. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |
| `zoom` | `boolean` | Enables pan and zoom interactions. Zoom is controlled via scroll. In practice, this applies to `<venus-graph>`. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |
| `nodeDetailsPanel` | `boolean` | Enables the node details panel in graph visualizations to support on-demand URI metadata inspection. When enabled, the panel appears on right-click of a node. <br>**Possible values:** `true`, `false`. <br>**Default:** `false`. |
| `tooltip` | `boolean` | Enables the tooltip on marks. Tooltips display detailed information about the data record represented by a mark and appear on hover. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |

