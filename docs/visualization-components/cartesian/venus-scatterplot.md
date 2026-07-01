# Scatter Plot

Also known as *Scatter Chart* or *Scatter Diagram*.

A Scatter Plot represents individual observations as points positioned by two quantitative variables (`x` and `y`). It is used to analyze relationships, distributions, clusters, and outliers.

> **Visualization component:** `<venus-scatterplot>`

## Minimal Template

```html
<venus-scatterplot id="scatter" width="100%" height="500"></venus-scatterplot>

<script type="module">
  import "@wimmics/venus";

  const scatter = document.querySelector("#scatter");

  scatter.sparqlEndpoint = "https://dbpedia.org/sparql";

  scatter.sparqlQuery = `
    SELECT ?educationIndex ?birthRate ?continentLabel ?population
    WHERE { ... }`;

  scatter.encoding = {
    x: { field: "educationIndex" },
    y: { field: "birthRate" },
    points: {
      color: { field: "continentLabel" },
      size: { field: "population" }
    }
  };

  scatter.launch();
</script>
```

## Marks and Channels

Scatter plots are defined through the `points` mark. 

The following visual channels are supported:

| Channel | Description | Documentation  |
|---|---|---|
| `color` | Defines the color of points. | See [Color](../../encoding/color.md) |
| `size`  | Defines the radious of points. | See [Size](../../encoding/size.md) |
| `strokeWidth` | Defines the stroke width of points. | See [Stroke Width](../../encoding/stroke-width.md)
| `stroke` | Defines the stroke color of points. | See [Stroke](../../encoding/stroke.md)


## Bubble plots

A bubble plot is a variation of a scatter plot in which the size of each point is mapped to a quantitative variable.

To create a bubble plot, define the `size` channel using a data field.

| Scatterplot | Bubble Plot |
|---|---|
|![Scatter Plot](/docs/figs/simple-scatter-plot.png) | ![Bubble Plot](/docs/figs/bubble-plot.png) |

