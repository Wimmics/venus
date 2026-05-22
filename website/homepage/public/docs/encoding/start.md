# Encoding

The encoding underpins most stages of the visualization pipeline, from data transformation to user interaction. VENUS adopts a Vega-inspired declarative specification to map SPARQL SELECT variables to marks (e.g., circles, bars) and visual channels (e.g., color, size). 

The encoding is a property of the visualization component used to configure the output visualization. For instance:

```js
const component = document.querySelector('venus-graph')

component.encoding = { ... }
```

## Properties

The encoding properties are designed to be transferable across visualizations, to the extent of what is possible. There are general encoding properties that are applied to every visualization, and a few specific ones according to the type of chart. This document describes the following visualization types and properties.

### Visualization Types

| Visualization Type | Description |
|---|---|
| [Network-based](./graph/) | Used to represent relationships among entities. |
| [Cartesian](./cartesian/) | Used to emphasize magnitude, ordering, and variation across dimensions. |

### Common Properties

| Property Name | Description |
|---|---|
| [`title`](./title.md) | Defines the chart title. |
| [`field`](./field.md) | Maps data variables to visual marks and channels. |
| [`color`](./color.md) | Configures the color of visual marks, either constant or data-driven. |
| [`size`](./size.md) | Configures the size of visual marks, either constant or data-driven. |
| [`labels`](./labels.md) | Configures label text and visibility for marks. |
| [`legend`](./legend.md) | Customizes the color and size legends. |
| [`interactions`](./interactions.md) | Configures user interactions with the visualization. |
