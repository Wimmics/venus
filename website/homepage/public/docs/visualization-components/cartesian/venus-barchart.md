# Bar Chart

Also known as *Bar Graph* or *Column Graph*.

A Bar Chart uses either horizontal or vertical bars (column chart) to show discrete, numerical comparisons across categories. One axis of the chart shows the specific categories being compared and the other axis represents a discrete value scale.

Bar Charts are distinguished from Histograms, as they do not display continuous developments over an interval. Instead, Bar Chart's discrete data is categorical and therefore answers the question of "how many?" in each category.

> **Visualization component:** `<venus-barchart>`

## Minimal Template

```html
<venus-barchart id="bar" width="100%" height="500"></venus-barchart>

<script type="module">
  import "@wimmics/venus-elements";

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

## Related Properties

| Encoding Property | Description | Documentation | Mandatory |
|---|---|---|:---:|
| `x` | Defines the categorical position field and horizontal axis options (`x.axis`). | [`x`](../../encoding/x.md) | ✓ |
| `y` | Defines the quantitative position field, vertical axis options (`y.axis`), and scale. | [`y`](../../encoding/y.md) | ✓ |
| `bars` | Configures bar marks: `groups`, `stack`, `color`, `size`, `tooltip`. | [`bars`](../../encoding/marks/bars.md) | ✗ |
| `axis` | Axis options are configured inside `x.axis` and `y.axis` (titles, label angle/offset, tick formatting). | [`axis`](../../encoding/axis.md) | ✗ |
| `color` | Color channel semantics used in `bars.color` (constant or data-driven). | [`color`](../../encoding/color.md) | ✗ |
| `size` | Size/thickness channel semantics used in `bars.size` (constant or data-driven). | [`size`](../../encoding/size.md) | ✗ |
| `scale` | Defines value-to-visual mapping for position/color/size channels. | [`scale`](../../encoding/scale.md) | ✗ |
| `legend` | Controls legend visibility, placement, and compact mode for mapped channels. | [`legend`](../../encoding/legend.md) | ✗ |
| `direction` | Switches chart orientation between vertical and horizontal bars. | [`direction`](../../encoding/direction.md) | ✗ |
| `interactions` | Enables/disables interactions, including global tooltip toggle (`interactions.tooltip`). | [`interactions`](../../encoding/interactions.md) | ✗ |
