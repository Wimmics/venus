# Scatter Plot

Also known as *Scatter Chart* or *Scatter Diagram*.

A Scatter Plot represents individual observations as points positioned by two quantitative variables (`x` and `y`). It is used to analyze relationships, distributions, clusters, and outliers.

> **Visualization component:** `<venus-scatterplot>`

## Minimal Template

```html
<venus-scatterplot id="scatter" width="100%" height="500"></venus-scatterplot>

<script type="module">
  import "@wimmics/venus-elements";

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

## Related Properties

| Encoding Property | Description | Documentation | Mandatory |
|---|---|---|:---:|
| `x` | Defines the horizontal position field and axis settings. | [`x`](../encoding/x.md) | ✓ |
| `y` | Defines the vertical position field, axis settings, and scale behavior. | [`y`](../encoding/y.md) | ✓ |
| `points` | Configures point marks (`display`, `color`, `size`, tooltip settings). | - | ✗ |
| `axis` | Controls axis title, label angle/offset, and tick formatting. | [`axis`](../encoding/types/axis.md) | ✗ |
| `color` | Color channel semantics used in point-level mappings (`points.color`). | [`color`](../encoding/color.md) | ✗ |
| `size` | Size channel semantics used in point-level mappings (`points.size`). | [`size`](../encoding/size.md) | ✗ |
| `scale` | Defines how data values map to position/color/size scales. | [`scale`](../encoding/scale.md) | ✗ |
| `legend` | Controls legend visibility, placement, and compact mode for mapped channels. | [`legend`](../encoding/legend.md) | ✗ |
| `interactions` | Enables/disables interactions (including tooltips) at visualization level. | [`interactions`](../encoding/interactions.md) | ✗ |
