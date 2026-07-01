# User Interactions

The `interactions` property controls user interactions with the visualization. Interactions are enabled by default in all visualizations. To use the visualization as a simple static representation of the data, user interactions can be disabled, either globally or by type of interaction.

```js
encoding: {
  interactions: {
    enabled: true,
    drag: true,
    zoom: true,
    tooltip: true
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Global interaction toggle. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |
| `drag` | `boolean` | Enables mark dragging via click-and-drag. **Graph-only feature:** only applies to `<venus-graph>` node dragging. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |
| `zoom` | `boolean` | Enables pan and zoom interactions. Zoom is controlled via scroll wheel (range: 10% to 800%). **Graph-only feature:** only applies to `<venus-graph>`. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |
| `tooltip` | `boolean` | Enables the tooltip on marks. Tooltips display detailed information about the data record represented by a mark and appear on hover. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |

## Interaction Support by Visualization

Different visualization types support different interaction capabilities:

| Visualization | Tooltip | Hover Effects | Drag | Zoom |
|---|---|---|---|---|
| **Bar Chart** | ✓ | ✓ | — | — |
| **Line Chart** | ✓ | ✓ (includes crosshair guides) | — | — |
| **Scatter Plot** | ✓ | ✓ (includes crosshair guides) | — | — |
| **Node-link Diagram** | ✓ | ✓ (connection highlighting) | ✓ | ✓ |
| **Sankey Diagram** | ✓ | ✓ (connection highlighting) | — | — |

## Hover Effects

Hover effects provide visual feedback when the user moves the cursor over marks. These effects are automatically enabled and cannot be toggled independently:

- **Bar, Line, Scatter Charts**: Non-hovered marks reduce opacity, highlighting the hovered mark.
- **Scatter Plot**: Displays crosshair guides (vertical and horizontal lines) when hovering over a point.
- **Node-link Diagram**: Highlights connections (nodes and links) related to a hovered node.
- **Sankey Diagram**: Highlights flow paths (links and nodes) related to a hovered element.

