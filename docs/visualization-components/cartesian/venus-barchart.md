# Bar Chart

Also known as *Bar Graph* or *Column Graph*.

A bar chart represents categorical data using rectangular bars whose length is proportional to a numeric value. Bars may be displayed vertically (column chart) or horizontally. Bar charts are well suited for comparing values across discrete categories.

> **Visualization component:** `<venus-barchart>`

## Minimal Template

```html
<venus-barchart id="bar" width="100%" height="500"></venus-barchart>

<script type="module">
  import "@wimmics/venus";

  const bar = document.querySelector("#bar");

  bar.sparqlEndpoint = "https://dbpedia.org/sparql";

  bar.sparqlQuery = `
    SELECT ?country ?languageCount
    WHERE { ... }
    LIMIT 20`;

  bar.encoding = {
    x: { field: "country" },
    y: { field: "languageCount" },
    bars: {
      stack: false,
      groups: { field: "languageFamily" }
    }
  };

  bar.launch();
</script>
```

## Marks and Channels

Bar charts are defined through the `bars` mark.

The following visual channels are supported:

| Channel | Description | Documentation  |
|---|---|---|
| `color` | Defines the color of bars. | See [Color](../../encoding/color.md) |
| `size`  | Defines the width of bars via `size.value` sub-property, which accepts a numeric value. | See [Size](../../encoding/size.md) |
| `strokeWidth` | Defines the stroke width of bars. | See [Stroke Width](../../encoding/stroke-width.md)
| `stroke` | Defines the stroke color of bars. | See [Stroke](../../encoding/stroke.md)


### Chart orientation

Bars may be displayed vertically or horizontally using the global direction property.

```js
encoding: {
  direction: "vertical"
}
```

Supported values: 
- `vertical` (default) 
- `horizontal`

| Vertical | Horizontal |
|---|---|
|![Vertical Bar Chart](/docs/figs/simple-bar-chart.png) | ![Horizontal Bar Chart](/docs/figs/simple-bar-chart-horizontal.png) |


## Stacked Bar Chart

VENUS supports both standard and stacked bar charts through the `bars.stack` property.

| Value               | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| `false` *(default)* | Standard bar chart.                                                            |
| `true`              | Stacked bar chart.                                                             |
| `"normalize"`       | 100% stacked bar chart, where each bar represents proportions summing to 100%. |

![Stacked Bar Chart](/docs/figs/stacked-bar-chart-vertical.png)

## Grouped Bar Chart

Grouped (or multi-set) bar charts display multiple bars for each category to compare different groups.

Grouping is controlled by the `bars.groups` property, which specifies the SPARQL variable used to partition each category.

```js
bars: {
  stack: false,
  groups: {
    field: "languageFamily"
  }
}
```
The values of `languageFamily` determine the grouped bars within each category.

![Grouped Bar Chart](/docs/figs/grouped-bar-chart.png)