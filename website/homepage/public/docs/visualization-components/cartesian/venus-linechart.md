# Line Chart

Also known as *Line Graph*.

A line chart represents the evolution of a quantitative variable along an ordered dimension. Data values are connected by line segments, making it suitable for visualizing trends, changes, and comparisons over time or other ordered sequences.

> **Visualization component:** `<venus-linechart>`

## Minimal Template

```html
<venus-linechart id="line" width="100%" height="500"></venus-linechart>

<script type="module">
  import "@wimmics/venus-elements";

  const line = document.querySelector("#line");

  line.sparqlEndpoint = "https://dbpedia.org/sparql";

  line.sparqlQuery = `
    SELECT ?year ?countryLabel ?continentLabel ?birthRate
    WHERE { ... }
    ORDER BY ?countryLabel ?year`;

  line.encoding = {
    x: { field: "year" },
    y: { field: "birthRate" },
    lines: {
      groups: { field: "countryLabel" },
      color: { field: "continentLabel" },
      size: { value: 2 }
    },
    points: { display: false }
  };

  line.launch();
</script>
```

## Mark and Channels

Line charts are defined through the `lines` mark. Optionally, the `points` mark may be used to display individual data values along each line.

Both marks support the following visual channels:

| Channel | Description | Documentation  |
|---|---|---|
| `color` | Defines the color of lines/points. | See [Color](../../encoding/color.md) |
| `size`  | Defines the line tickness or points radius. | See [Size](../../encoding/size.md) |
| `strokeWidth` | Defines the stroke width of points/lines. | See [Stroke Width](../../encoding/stroke-width.md)
| `stroke` | Defines the stroke color of points/lines. | See [Stroke](../../encoding/stroke.md)

| Simple Line Chart | Line Chart with Points |
|---|---|
|![Simple Line Chart](/docs/figs/simple-line-chart.png) | ![Simple Line Chart with Points](/docs/figs/simple-line-chart-points.png) |

### Displaying Points

The `points` mark controls whether points are displayed on top of the lines.

```js
points: {
  display: true
}
```

By default, points are displayed. To hide them, set `points.display` to false.

## Multi-line Chart

Multi-line charts display several lines within the same chart to compare multiple groups.

Grouping is controlled by the `lines.groups` property, which specifies the SPARQL variable used to partition the data into distinct series.

```js
lines: {
  groups: {
    field: "countryLabel"
  }
}
```
Each distinct value of `countryLabel` produces a separate line.

![Multi-line Chart](/docs/figs/multiline-line-chart.png) 

