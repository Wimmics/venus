# Sankey Diagram

Also known as *Flow Diagram* or *Alluvial-style Flow Chart*.

A Sankey diagram represents flows across ordered stages. Nodes are grouped by stage (columns), and links connect adjacent stages. Link thickness represents magnitude, making Sankey diagrams useful to analyze transitions, funnels, and distribution of quantities across steps.

> **Visualization component:** `<venus-sankey>`

## Minimal Template

```html
<venus-sankey id="sankey" width="100%" height="520"></venus-sankey>

<script type="module">
  import "@wimmics/venus-elements";

  const sankey = document.querySelector("#sankey");

  sankey.sparqlEndpoint = "https://dbpedia.org/sparql";

  sankey.sparqlQuery = `
    SELECT ?affiliation ?country ?city (COUNT(*) AS ?count)
    WHERE { ... }
    GROUP BY ?affiliation ?country ?city
    LIMIT 200`;

  sankey.encoding = {
    nodes: {
      fields: ["affiliation", "country", "city"]
    },
    links: {
      value: { field: "count" }
    }
  };

  sankey.launch();
</script>
```

## Related Properties

| Encoding Property | Description | Documentation | Mandatory |
|---|---|---|:---:|
| `nodes.fields` | Defines ordered Sankey stages. Supports string entries and object entries with stage options. | [`nodes`](../../encoding/marks/nodes.md) | ✓ |
| `links.value.field` | Defines the numeric metric used for link magnitude. When omitted, each binding contributes `1`. | [`links`](../../encoding/marks/links.md) | ✗ |
| `nodes.sort` | Global fallback sort strategy for node order inside each stage. | [`nodes`](../../encoding/marks/nodes.md) | ✗ |
| `nodes.fields[i].sort` | Stage-specific sort override for node order inside stage `i`. | [`nodes`](../../encoding/marks/nodes.md) | ✗ |
| `nodes.align` | Controls stage alignment strategy (`justify`, `left`, `right`, `center`). | [`nodes`](../../encoding/marks/nodes.md) | ✗ |
| `nodes.padding` | Vertical spacing between nodes inside each stage. | [`nodes`](../../encoding/marks/nodes.md) | ✗ |
| `nodes.color` / `nodes.fields[i].color` | Node color mapping (global or stage-specific). | [`color`](../../encoding/color.md) | ✗ |
| `links.color` | Link color mapping (constant or data-driven). | [`color`](../../encoding/color.md) | ✗ |
| `links.opacity.value` | Constant link opacity (`0` to `1`). | [`links`](../../encoding/marks/links.md) | ✗ |
| `labels` | Node and link label settings through `nodes.labels` and `links.labels`. | [`labels`](../../encoding/labels.md) | ✗ |
| `scale` | Scale settings for data-driven color channels. | [`scale`](../../encoding/scale.md) | ✗ |
| `legend` | Legend settings for mapped channels. | [`legend`](../../encoding/legend.md) | ✗ |
| `interactions` | Enables/disables interactions, including tooltips through `interactions.tooltip`. | [`interactions`](../../encoding/interactions.md) | ✗ |

## Sankey-Specific Values

### `nodes.fields`

`nodes.fields` must be an array with at least two stage definitions.

Allowed entry formats:

- `"fieldName"`
- `{ "field": "fieldName", "title"?: string, "color"?: object, "sort"?: string|object }`

Example:

```js
nodes: {
  fields: [
    { field: "affiliation", title: "Affiliation", sort: "alpha" },
    { field: "country", sort: { by: "value", mode: "total", order: "desc" } },
    "city"
  ]
}
```

### `nodes.sort` and `nodes.fields[i].sort`

Accepted sort values:

- String shorthand: `"layout"`, `"alpha"`, `"count"`, `"value"`
- Object form:

```js
{ by: "layout|alpha|count|value", order?: "asc|desc", mode?: "total|in|out" }
```

Rules:

- `mode` is only valid for `by: "count"` or `by: "value"`.
- Stage sort (`nodes.fields[i].sort`) overrides global sort (`nodes.sort`).
- If no sort is defined, default behavior is layout-based ordering.

### `nodes.align`

Allowed values:

- `"justify"` (default)
- `"left"`
- `"right"`
- `"center"`

### `links.value.field`

- Type: `string`
- Must reference a SPARQL variable available in the result set.
- If missing or non-numeric per row, VENUS falls back to row increment `1` for that row.

## Complete Sankey Encoding Template

```js
encoding: {
  nodes: {
    // ordered stages
    fields: [
      {
        field: "stageA",
        title: "Stage A",
        color: {
          field: "category",
          scale: { type: "ordinal", range: "Set3" },
          legend: { display: true, position: "bottom" }
        },
        sort: { by: "alpha", order: "asc" }
      },
      {
        field: "stageB",
        sort: { by: "value", mode: "total", order: "desc" }
      },
      "stageC"
    ],

    // global fallback for stages that do not define fields[i].sort
    sort: { by: "layout", order: "asc", mode: null },

    // layout
    align: "justify", // justify | left | right | center
    padding: 2,
    size: { value: 25 },

    // optional global color/labels/tooltip
    color: { value: "#69b3a2" },
    labels: { display: true, field: "label" },
    tooltip: { fields: ["stageA", "stageB", "stageC"] }
  },

  links: {
    value: { field: "count" },
    color: { value: "#999" },
    opacity: { value: 0.35 },
    labels: { display: false },
    tooltip: { fields: ["count"] }
  },

  interactions: { tooltip: true }
}
```

## Allowed Values Summary

- `nodes.align`: `justify`, `left`, `right`, `center`
- `nodes.sort.by` / `nodes.fields[i].sort.by`: `layout`, `alpha`, `count`, `value`
- `nodes.sort.order` / `nodes.fields[i].sort.order`: `asc`, `desc`
- `nodes.sort.mode` / `nodes.fields[i].sort.mode`: `total`, `in`, `out` (only for `count` and `value`)
