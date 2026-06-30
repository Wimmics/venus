# Sankey Diagram

Sankey Diagrams display flows and their quantities in proportion to one another. Typically, Sankey Diagrams are used to visually represent the transfer of energy, money, materials, or the flow of any isolated system or process.

The thickness of the lines shows their magnitudes or quantities. Flow lines can combine or split apart at each stage of a process.

Colour can be used to divide the diagram into different categories or to show the transition from one state of the process to another. 

**Visualization component:** `<venus-sankey>`

![Sankey Diagram](/docs/figs/sankey-simple.png)

## Minimal Template

Sankey diagrams are defined using the `nodes` and `links` marks. The table below summarizes their purpose and links to the corresponding documentation, where all supported channels and attributes are described.

| Marks | Description | Documentation | Mandatory
|---|---|---|:---:|
| `nodes` | Defines the different stages of the process. | See [Nodes](../../encoding/marks/nodes.md) | ✓ 
| `links` | Defines and styles the flows between stages. | See [Links](../../encoding/marks/links.md) | ✓ |

The code snippet below provides a minimal template for creating a sankey diagram. Additional channels and attributes may be required according to the level of styling desired, as explained hereafter.

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

## Sankey stages

Sankey stages are defined through the `nodes.fields` property, which accepts either string or object entries.

### String entries

A string entry specifies the SPARQL variable whose bindings define the nodes of a stage.

```js
nodes: {
  fields: ["country", "city", "organization"]
}
````

### Object entries

An object entry provides additional configuration options for a stage.

| Property | Description                                                                     |
| -------- | ------------------------------------------------------------------------------- |
| `field`  | SPARQL variable whose bindings define the stage nodes.                          |
| `title`  | Custom label displayed below the stage.                                         |
| `color`  | Color channel applied to the stage nodes. See [Color](../../encoding/color.md). |
| `sort`   | Defines how the nodes within the stage are ordered.                             |

Example:

```js
nodes: {
  fields: [
    {
      field: "country",
      title: "Country",
      color: { field: "continent" },
      sort: { by: "count" }
    }
  ]
}
```



### Stage sorting

The `sort` property controls the ordering of nodes within a stage. 

#### String values

| Value                  | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| `"layout"` *(default)* | Uses the D3 Sankey layout algorithm to minimize link crossings.       |
| `"alpha"`              | Sorts nodes alphabetically by label.                                  |
| `"count"`              | Sorts nodes by the number of incoming, outgoing, or total links.      |
| `"value"`              | Sorts nodes by the total value of incoming, outgoing, or total links. |

#### Object form

```js
sort: {
  by: "layout" | "alpha" | "count" | "value",
  order: "asc" | "desc",      // optional
  mode: "total" | "in" | "out" // optional
}
```

##### Rules

* `mode` is only applicable when `by` is `"count"` or `"value"`.
* A stage-specific sort (`nodes.fields[i].sort`) overrides the global sort (`nodes.sort`).
* If no sort is specified, nodes are ordered using the default `"layout"` strategy.

### Global stage properties

Most stage properties can be defined either globally on the `nodes` mark or individually for each stage. When both are specified, stage-specific settings override the global configuration.

- **Sorting**: Define a global sorting strategy using `nodes.sort`, or override it for a specific stage using `nodes.fields[i].sort`.

- **Color**: Define a global color mapping using `nodes.color`, or specify a stage-specific mapping with `nodes.fields[i].color`.

- **Spacing**: The vertical spacing between nodes within a stage is controlled globally through `nodes.padding`, which accepts a numeric value.

- **Width**: The width of stage nodes is controlled globally through `nodes.size.value`, which accepts a numeric value. In Sankey diagrams, node width is a visual styling property rather than a data encoding. To maintain consistency across visualization techniques, VENUS uses the `size` channel to control this property.

## Sankey flows

Flows are defined through the `links` mark, which controls both their appearance and magnitude.

| Encoding Property | Description | Documentation  |
|---|---|---|:---:|
| `links.color` | Link color mapping (constant or data-driven). | See [Color](../../encoding/color.md) | 
| `links.opacity.value` | Constant link opacity (`0` to `1`). | | 
| `links.value` | Defines the magnitude of each flow. | | 

### Flow magnitude

The `links.value` property determines the width of Sankey flows. It accepts either:

- a numeric constant, assigning the same magnitude to every flow;
- an object specifying the SPARQL variable that provides the numeric value for each flow.

If `links.value` is omitted, each binding contributes a value of `1`.

**Example**

```js
links: {
  value: {
    field: "count"
  }
}
```

In this example, the width of each flow is proportional to the values returned by the `?count` variable in the SPARQL query.

## Sankey layout

The layout of Sankey stages is controlled by the `nodes.align` property, which specifies the stage alignment strategy used by the D3 Sankey layout algorithm. The supported values are:

- `"justify"` *(default)*: aligns source nodes to the left and sink nodes to the right.
- `"left"`: aligns all nodes as far left as possible.
- `"right"`: aligns all nodes as far right as possible.
- `"center"`: centers nodes between their incoming and outgoing links.

See the [D3 Sankey alignment documentation](https://github.com/d3/d3-sankey#alignments) for additional details on each alignment strategy.


## Complete Sankey Encoding Template

The example below provide complete, ready-to-use encodings for the sabkey diagram, including all default values. Only the properties required to identify the nodes and flow magnitude (`links.value`) are mandatory. All other properties correspond to default values automatically applied by VENUS and may be omitted unless customization is required.

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

