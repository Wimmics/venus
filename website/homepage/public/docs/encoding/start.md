# Encoding

The encoding underpins most stages of the visualization pipeline, from data transformation to user interaction. VENUS adopts a Vega-inspired declarative specification to map SPARQL SELECT variables to marks (e.g., circles, bars) and visual channels (e.g., color, size). 

The encoding is a property of the visualization component used to configure the output visualization. For instance:

```js
const component = document.querySelector('venus-graph')

component.encoding = { ... }
```




## Marks

Marks are the basic visual building block of a visualization. They provide basic shapes whose properties (such as position, size, and color) can be used to visually encode data, either from a data field, or a constant value. Venus currently supports the following marks:

| Mark | Description |
|---|---|
| [`bars`](./marks/bars.md) | A rectangle-shaped mark representing a quantitative value through its length or height.  |
| [`lines`](./marks/lines.md) | A line-shaped mark connecting data points to represent relationships or trends. |
| [`points`](./marks/points.md) | A dot-shaped mark representing an individual data item at a specific position. |
| [`nodes`](./marks/nodes.md) | A circle-shaped mark representing an entity or object in a graph. |
| [`links`](./marks/links.md) | A line-shaped mark representing a relationship or connection between two nodes. |

Multiple marks can be combined within a single visualization. For example, a line chart may include both lines and points, where points represent individual data values. See [`Visualization Components`](../visualization-components/start.md) for the list of supported marks per visualization technique.

### Data Fields

The `field` property allows to select which data key drives a mark, visual channel or attribute.

```js
encoding: {
  nodes: {
    color: { field: "speciesLabel" },
    size: { field: "articleCount" }
  },
  links: {
    color: { field: "type" }
  }
}

encoding: {
  x: { field: "country" },
  y: { field: "languageCount" },
  color: { field: "language" }
}
```

**Notes**

- Prefer stable, non-null fields for color categories.
- For quantitative channels (size), ensure field values are numeric.
- When values are sparse, set fallback `value` on the channel.


### Attributes 
Mark attributes define supplementary properties of a mark that affect its presentation or interaction but do not constitute visual encodings of the underlying data. Examples include labels, tooltips, and display options. 

The following attributes are supported across marks:

| Attribute | Description | 
|---|---|---|:---:|
| `labels` | The `labels` property configures label text for a mark. It can also control whether visible label text is drawn on marks that support it. |
| `tooltip` | Mark-specific property. Defines tooltip format through `tooltip.title` and `tooltip.fields` |

#### Labels

Labels can be customized via the following properties:

| Property | Type | Description |
|---|---|---|
| `labels.display` | `boolean` | Shows or hides supported visible mark labels. Possible values: `true`, `false`. <br>**Default:** `true` for graph nodes, `false` for bars, lines, and points. |
| `labels.value` | `string` | Constant label text for the mark. <br>**Default:** not set. |
| `labels.field` | `string` | Data field used as label text for each mark. <br>**Default:** the mark field value when text is needed. |

**Rules**

When no explicit text is provided:
- graph marks fall back to the mark field value when available
- bars fall back to the `x.field` value
- lines fall back to the series key
- points fall back to the `y.field` value

**Example**

```js
encoding: {
  nodes: {
    labels: {
      display: true,
      field: "labelField"
    }
  }
}
```

#### Tooltips

Tooltips provide additional information about a mark when it is hovered. They allow users to inspect the underlying data without permanently displaying labels, helping to reduce visual clutter while preserving access to detailed information.

The following properties are available to customize tooltips:

| Property | Type | Description |
|---|---|---|
| `tooltip.title` | `string` / `object` | Optional tooltip title as a constant string or `{ field }`. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered nodes. If omitted, fields are selected automatically. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../interactions.md). |

### Channels

Channels define how data is mapped to the visual properties of a mark. They determine how data values are encoded using graphical variables such as position, color, size, shape, opacity, or stroke.

VENUS currently supports the following channels across marks:

| Channel       | Description                        |
| ------------- | ---------------------------------- |
| `color`       | Defines the fill color of marks.   |
| `size`        | Defines the size of marks.         |
| `strokeWidth` | Defines the stroke width of marks. |
| `stroke`      | Defines the stroke color of marks. |
| `opacity`     | Defines the opacity of marks. Currently supported for Sankey links only. |

### Supported Channels by Visualization Type

Not all channels are supported for all visualization types. The following matrix shows which channels are available for each visualization:

| Visualization | Mark(s) | Supported Channels |
|---|---|---|
| **Bar Chart** | `bars` | `color`, `stroke`, `strokeWidth` |
| **Line Chart** | `lines`, `points` | **lines**: `color`, `stroke`, `strokeWidth`<br>**points**: `color`, `size`, `stroke`, `strokeWidth` |
| **Scatter Plot** | `points` | `color`, `size`, `stroke`, `strokeWidth` |
| **Node-link Diagram** | `nodes`, `links` | **nodes**: `color`, `size`, `stroke`, `strokeWidth`<br>**links**: `color`, `stroke`, `strokeWidth` |
| **Sankey Diagram** | `nodes`, `links` | **nodes**: `color`, `stroke`, `strokeWidth`<br>**links**: `color`, `stroke`, `strokeWidth`, `opacity` |

### Color channel

The `color` property maps a constant value, a data field, or (when supported) a metric to the color of marks.

```js
encoding: {
  color: {
    field: "language",
    value: "#cccccc",
    scale: { type: "ordinal", range: "Set3" },
    legend: { title: "Language", display: true }
  }
}
```

The following properties are supported:

| Property | Type     | Description                                                                                       |
| -------- | -------- | ------------------------------------------------------------------------------------------------- |
| `field`  | `string` | Data field used for color mapping.                                                                |
| `metric` | `string` | Metric used for color mapping when supported by a mark. Graph nodes currently support `"degree"`. |
| `value`  | `string` | Constant color value (any valid CSS color).                                                       |
| `scale`  | `object` | Scale configuration for data-driven color. See [`scale`](./scale.md).                             |
| `legend` | `object` | Legend configuration. See below.                                                |

**Notes**

- `field`, `metric`, and `value` are mutually exclusive.
- When neither `field` nor `metric` is specified, `value` is used.
- Metric-based color is currently supported only for graph nodes.

### Size channel

The `size` property maps a constant value, a data field, or (when supported) a metric to the size of marks.

```js
encoding: {
  points: {
    size: {
      field: "population",
      scale: { type: "linear", range: [4, 18] },
      legend: { title: "Population" }
    }
  }
}
```

The following properties are supported:

| Property | Type     | Description                                                                                      |
| -------- | -------- | ------------------------------------------------------------------------------------------------ |
| `field`  | `string` | Data field used for size mapping.                                                                |
| `metric` | `string` | Metric used for size mapping when supported by a mark. Graph nodes currently support `"degree"`. |
| `value`  | `number` | Constant size value.                                                                             |
| `scale`  | `object` | Scale configuration for data-driven size. See [`scale`](./scale.md).                             |
| `legend` | `object` | Legend configuration. See below.                                               |

**Notes**

- `field`, `metric`, and `value` are mutually exclusive.
- Metric-based sizing is currently supported only for graph nodes.
- The meaning of the size channel depends on the mark (e.g., node radius, point radius, bar width, Sankey node width).


### Stroke channel

The `stroke` property maps a constant value or a data field to the outline color of marks.

```js
encoding: {
  stroke: {
    field: "continent",
    value: "#333333",
    scale: { type: "ordinal" },
    legend: { title: "Continent" }
  }
}
```

The following properties are supported:

| Property | Type     | Description                                                                  |
| -------- | -------- | ---------------------------------------------------------------------------- |
| `field`  | `string` | Data field used for stroke color mapping.                                    |
| `value`  | `string` | Constant stroke color (any valid CSS color).                                 |
| `scale`  | `object` | Scale configuration for data-driven stroke color. See [`scale`](./scale.md). |
| `legend` | `object` | Legend configuration. See below.                           |

**Notes**

- `field` and `value` are mutually exclusive.
- When `field` is omitted, `value` is used.


### Stroke width channel

The `strokeWidth` property maps a constant value or a data field to the outline width of marks.

```js
encoding: {
  strokeWidth: {
    value: 2
  }
}
```

The following properties are supported:

| Property | Type     | Description                                                                  |
| -------- | -------- | ---------------------------------------------------------------------------- |
| `field`  | `string` | Data field used for stroke width mapping.                                    |
| `value`  | `number` | Constant stroke width.                                                       |
| `scale`  | `object` | Scale configuration for data-driven stroke width. See [`scale`](./scale.md). |
| `legend` | `object` | Legend configuration. See below.                          |

**Notes**

- `field` and `value` are mutually exclusive.
- When `field` is omitted, `value` is used.

## Legends

The `legend` property controls the display and appearance of legends associated with data-driven channels. Legends are configured independently for each channel. By default, a legend is displayed whenever a channel is mapped to a data field or metric.

```js
encoding: {
  nodes: {
    color: {
      field: "speciesLabel",
      legend: { title: "Species", position: "left", display: true }
    }
  }
}
```

The following properties are supported:

| Property | Type | Description |
|---|---|---|
| `title` | `string` | A title for the legend. <br>**Possible values:** any string. <br>**Default:** channel field or metric name. |
| `position` | `string` | Position of the legend relative to the visualization. <br>**Possible values:** `left`, `right`, `top`, `bottom`, and corner variants (`top-left`, `bottom-right`, etc.). <br>**Default:** `"bottom"`. |
| `display` | `boolean` | Whether the legend is displayed. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |
| `compact` | `boolean` | Whether the legend is displayed in compact (collapsible) mode. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |

## Component Properties

In addition to mark channels and attributes, VENUS provides component-level properties that control the overall appearance and behavior of a visualization. The following properties are supported:

| Property Name | Type | Description |
|---|---|---|
| `title` | `string` | Title displayed above the visualization. Possible values: any non-empty string. <br>**Default:** none (no title is displayed). |
| `background` | `string` | Background color of the visualization. Possible values: any valid CSS color (for example `"#ffffff"`, `"white"`, `rgb(...)`). Default: `"#ffffff"`. |
| `interactions` | - | Configures user interactions, such as tooltips, selection, and zoom. See [Interactions](../encoding/interactions.md) |
