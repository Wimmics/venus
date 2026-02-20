# Bar Chart

Also known as *Bar Graph* or *Column Graph*.

A Bar Chart uses either horizontal or vertical bars (column chart) to show discrete, numerical comparisons across categories. One axis of the chart shows the specific categories being compared and the other axis represents a discrete value scale.

Bar Charts are distinguished from Histograms, as they do not display continuous developments over an interval. Instead, Bar Chart's discrete data is categorical and therefore answers the question of "how many?" in each category. 

> **Visualization component:** `<vis-barchart>`

## Minimal Template

```html
<vis-barchart id="bar" width="100%" height="500"></vis-barchart>

<script type="module">
  import "@wimmics/venus-webcomponents";

  const bar = document.querySelector("#bar");

  bar.sparqlEndpoint = "https://dbpedia.org/sparql";

  bar.sparqlQuery = `
    SELECT ?country ?languageCount 
    WHERE { ... } 
    LIMIT 20`;

  bar.encoding = {
    x: { field: "country" },
    y: { field: "languageCount" }
  };

  bar.launch();
</script>
```

## Related Properties

| Encoding Property | Description | Documentation | Mandatory |
|---|---|---|:---:|
| `x` | Defines category placement on the horizontal axis (or vertical in horizontal mode). | [`x`](../encoding/x.md) | ✓ 
| `y` | Defines quantitative value placement on the vertical axis (or horizontal in horizontal mode). | [`y`](../encoding/y.md) | ✓ 
| `axis` | Controls axis labels, tick formatting, and tick spacing. | [`axis`](../encoding/types/axis.md) |  ✗ 
| `color` | Applies category/value-based color encoding to bars. | [`color`](../encoding/color.md) |  ✗ 
| `scale` | Defines how quantitative values map to visual extents. | [`scale`](../encoding/scale.md) |  ✗ 
| `legend` | Controls legend visibility, placement, and compact mode for color encodings. | [`legend`](../encoding/legend.md) |  ✗ 
| `direction` | Switches chart orientation between vertical and horizontal bars. | [`direction`](../encoding/direction.md) |  ✗ 
| `stack` | Chooses grouped, stacked, or normalized stacked bar behavior. | [`stack`](../encoding/stack.md) |  ✗ 
