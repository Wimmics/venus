# Line Chart

Also known as *Line Graph*.

A Line Chart displays how a quantitative variable evolves along an ordered dimension. Values are connected by line segments, making it easier to read trends, slopes, and turning points over time or sequence.

> **Visualization component:** `<venus-linechart>`

## Minimal Template

```html
<venus-linechart id="line" width="100%" height="500"></venus-linechart>

<script type="module">
  import "@wimmics/venus-elements";

  const line = document.querySelector("#line");

  line.sparqlEndpoint = "https://dbpedia.org/sparql";

  line.sparqlQuery = `
    SELECT ?year ?count
    WHERE { ... }
    ORDER BY ?year`;

  line.encoding = {
    x: { field: "year" },
    y: { field: "count" },
    lines: {
      color: { field: "category" },
      size: { value: 2 }
    },
    points: { display: false }
  };

  line.launch();
</script>
```

## Related Properties

| Encoding Property | Description | Documentation | Mandatory |
|---|---|---|:---:|
| `x` | Defines the horizontal position field and axis settings. | [`x`](../encoding/x.md) | ✓ |
| `y` | Defines the vertical position field, axis settings, and scale behavior. | [`y`](../encoding/y.md) | ✓ |
| `lines` | Configures line mark appearance (notably `color` and `size`). | - | ✗ |
| `points` | Controls optional point marks on top of lines (`display`, `color`, `size`, tooltip settings). | - | ✗ |
| `axis` | Controls axis title, label angle/offset, and tick formatting. | [`axis`](../encoding/types/axis.md) | ✗ |
| `color` | Color channel semantics used in mark-level mappings (for example `lines.color`, `points.color`). | [`color`](../encoding/color.md) | ✗ |
| `size` | Size/thickness channel semantics used in mark-level mappings (for example `lines.size`, `points.size`). | [`size`](../encoding/size.md) | ✗ |
| `scale` | Defines how data values map to position/color/size scales. | [`scale`](../encoding/scale.md) | ✗ |
| `legend` | Controls legend visibility, placement, and compact mode for mapped channels. | [`legend`](../encoding/legend.md) | ✗ |
| `interactions` | Enables/disables interactions (including tooltips) at visualization level. | [`interactions`](../encoding/interactions.md) | ✗ |
