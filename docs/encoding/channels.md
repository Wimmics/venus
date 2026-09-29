# Visual Variables (or Channels)

Visual variables (or channels) define how data is mapped to the visual properties of a mark. They determine how data values are encoded using graphical variables such as position, color, size, shape, opacity, or stroke.

VENUS currently supports the following visual variables:

| Channel       | Description                        |
| ------------- | ---------------------------------- |
| `color`       | Defines the fill color of marks.   |
| `size`        | Defines the size of marks.         |
| `strokeWidth` | Defines the stroke width of marks. |
| `stroke`      | Defines the stroke color of marks. |
| `opacity`     | Defines the opacity of marks. Currently supported for Sankey links only. |

Not all visual variables are supported for all visualization types. The table below shows which visual variables are available for each visualization:

| Visualization | Mark(s) | Supported Visual Variables |
|---|---|---|
| **Bar Chart** | `bars` | `color`, `stroke`, `strokeWidth` |
| **Line Chart** | `lines`, `points` | **lines**: `color`, `stroke`, `strokeWidth`<br>**points**: `color`, `size`, `stroke`, `strokeWidth` |
| **Scatter Plot** | `points` | `color`, `size`, `stroke`, `strokeWidth` |
| **Node-link Diagram** | `nodes`, `links` | **nodes**: `color`, `size`, `stroke`, `strokeWidth`<br>**links**: `color`, `stroke`, `strokeWidth` |
| **Sankey Diagram** | `nodes`, `links` | **nodes**: `color`, `stroke`, `strokeWidth`<br>**links**: `color`, `stroke`, `strokeWidth`, `opacity` |

## Color

The `color` variable maps a constant value, a data field, or (when supported) a metric to the color of marks.

```json
{
  	"color": {
    	"field": "language",
    	"value": "#cccccc",
    	"scale": { "type": "ordinal", "range": "Set3" },
    	"legend": { "title": "Language", "display": true }
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

## Size

The `size` variable maps a constant value, a data field, or (when supported) a metric to the size of marks.

```json
{
  	"points": {
    	"size": {
      		"field": "population",
      		"scale": { "type": "linear", "range": [4, 18] },
      		"legend": { "title": "Population" }
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


## Stroke

The `stroke` variable maps a constant value or a data field to the outline color of marks.

```json
{
  	"stroke": {
		"field": "continent",
		"value": "#333333",
		"scale": { "type": "ordinal" },
		"legend": { "title": "Continent" }
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


## Stroke width 


The `strokeWidth` variable maps a constant value or a data field to the outline width of marks.

```json
{
  	"strokeWidth": {
    	"value": 2
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

The `legend` property controls the display and appearance of legends associated with data-driven visual variables. Legends are configured independently for each visual variable. By default, a legend is displayed whenever a visual variable is mapped to a data field or metric.

```json
{
  	"nodes": {
		"color": {
			"field": "speciesLabel",
			"legend": { 
				"title": "Species", 
				"position": "left", 
				"display": true 
			}
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