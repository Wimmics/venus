# Node-link Diagram

Also known as *Network Graph*, *Network Map*, *Force-directed Graph*, *Network Diagram*.

This type of visualisation shows how things are interconnected through the use of nodes and link lines to represent their connections and help illuminate the type of relationships between a group of entities. 

Nodes are drawn as circles and links are displayed as simple lines connected between the nodes. Not all of the nodes and links are created equally: additional variables can be visualised, for example, by making the node size or link stroke weight proportion to an assigned value. 

By mapping out connected systems, node-link diagrams can be used to interpret the structure of a graph by looking for any clustering of the nodes, how densely nodes are connected or how the diagram layout is arranged.


Node-link diagrams are defined using the `nodes` and `links` marks. The table below summarizes their purpose and links to the corresponding documentation, where all supported channels and attributes are described.

| Encoding Property | Description | Documentation | Mandatory
|---|---|---|:---:|
| `nodes` | Defines node identity and node visual channels (color, size, labels, stroke, tooltip). | See [Nodes](../../encoding/marks/nodes.md) | ✓ 
| `links` | Defines how links are built and styled (type, relation/context, color, distance, tooltip). | See [Links](../../encoding/marks/links.md) | ✓ (except directional)

**Visualization component:** `<venus-graph>`

## Minimal template

The code snippet below provides a minimal template for creating a node-link diagram. Depending on the selected node-link diagram type, additional channels and attributes may be required, as described in the following sections.

```html
<venus-graph id="graph" width="100%" height="520"></venus-graph>

<script type="module">
  import "@wimmics/venus-elements";

  const graph = document.querySelector("#graph");

  graph.sparqlEndpoint = "https://dbpedia.org/sparql";

  graph.sparqlQuery = `
    SELECT ?source ?target 
      WHERE { 
        ?source dbo:starring ?target 
      } LIMIT 30`;
  
  graph.encoding = {
    nodes: { ... },
    links: { ... }
  };

  graph.launch();
</script>
```
## Marks and Properties

### Nodes

Nodes are defined through the `nodes` mark, which accepts one of the following forms:

- A single node definition:
```js
  { field: "variable" }
```

- Separate definitions for source and target nodes:

```js
{
	source: { field: "source" },
	target: { field: "target" }
}
```

In both cases, `field` refers to a variable returned by the SPARQL query.

The `source` and `target` objects support the same channels and attributes as `nodes`. Channels and attributes may be defined globally on the `nodes` mark or locally within `source` and `target`. When a property is specified locally, it overrides the corresponding global setting.

The appropriate form depends on the selected node-link diagram type (see below).

### Links

Links are defined through the links mark. In addition to controlling their visual appearance, they determine the type of node-link diagram to generate. VENUS supports three link types:

- `directional`
- `semantic`
- `cooccurrence`

Each link type defines how links are interpreted and constructed. The following sections describe the required properties and behavior of each type.


### Common channels

The following channels are supported by both nodes and links. For nodes, they may be applied globally or defined separately for `nodes.source` and `nodes.target`.

| Channel | Description | Documentation  |
|---|---|---|
| `color` | Defines the color of nodes. | See [Color](../../encoding/color.md) |
| `size`  | Defines the radius of nodes. | See [Size](../../encoding/size.md) |
| `strokeWidth` | Defines the stroke width of nodes. | See [Stroke Width](../../encoding/stroke-width.md)
| `stroke` | Defines the stroke color of nodes. | See [Stroke](../../encoding/stroke.md)

Links further exposes the `links.distance.value` property, which specifies the preferred distance between connected nodes used by the force-directed layout algorithm. It accepts a numeric value.

#### Metric-based sizing and coloring

In addition to mapping node size and color to a data field, VENUS supports metric-based sizing and coloring. Currently, the only supported metric is `"degree"`, which sizes/colors nodes according to the number of connected links.

Metric-based sizing and coloring can be applied globally or separately to source and target nodes:

- `nodes.[channel].metric: "degree"`
- `nodes.source.[channel].metric: "degree"`
- `nodes.target.[channel].metric: "degree"`

where `[channel]` may be `color` or `size`.

**Rules**

- `metric` and `field` are mutually exclusive within a single `size` definition.
- The computed metric values can be combined with any supported size scale.

**Example**

```js
nodes: {
  source: { field: "actorName" },
  target: { field: "movieName" },
  size: {
    metric: "degree",
    scale: { type: "linear", range: [5, 25] },
    legend: { title: "Degree" }
  }
}
```

In this example, nodes with a higher degree (i.e., more connected links) are rendered larger.


## Node-link diagram types

VENUS supports two categories of node-link diagrams:

- **Undirected graphs**, which represent relationships based solely on connectivity between entities.
- **Directed graphs**, which represent relationships with a direction indicated by arrows.

### Directed graphs

VENUS provides two types of directed node-link diagrams:

- **`directional`** *(default)*: links represent directed connections between nodes without any explicit semantic meaning.
- **`semantic`**: links are labeled by a predicate returned by the SPARQL query, making this representation particularly suitable for exploring the structure of a knowledge graph using queries such as `SELECT * WHERE { ?s ?p ?o }`.

Both graph types require defining the `nodes.source` and `nodes.target` objects, which determine the direction of each link.

#### Directional graph

![Directional](/docs/figs/venus-graph-directional.png)

A minimal directional graph is defined as follows:

```json
{
  "nodes": {
    "source": { "field": "s" },
    "target": { "field": "o" }
  },
  "links": {
    "type": "directional"
  }
}
```

If `links.type` is omitted, it defaults to `"directional"`. Each `field` refers to a variable returned by the SPARQL `SELECT` query.

#### Semantic graph

![Semantic](/docs/figs/venus-graph-semantic.png)

In addition to the source and target nodes, a semantic graph requires the predicate defining each relationship to be specified through `links.relation.field`. The link type must also be explicitly set to `"semantic"`.

```json
{
  "nodes": {
    "source": { "field": "s" },
    "target": { "field": "o" }
  },
  "links": {
    "type": "semantic",
    "relation": {
      "field": "p"
    }
  }
}
```

Here, the `p` variable provides the label (predicate) associated with each directed relationship.


### Undirected Graph

Undirected graphs represents relationships based on the co-occurrence of values within a common context. To define one, only the `nodes` and `links` marks are required. Since co-occurrence graphs are undirected, `nodes.source` and `nodes.target` do not need to be specified. Instead, VENUS automatically creates links between nodes that co-occur in the same context.

**Example**

Given the query:

```sparql
SELECT ?publication ?author
WHERE {
  ?publication a bibo:AcademicArticle ;
               dct:creator ?author .
}
```

a `cooccurrence` graph using `publication` as the context connects authors who have co-authored at least one publication. Each node represents an author, and an undirected link is created between two authors whenever they appear together in the same publication.

#### Cooccurrence graph

![Co-occurrence](/docs/figs/venus-graph-cooccurrence.png)

```json
{
	"nodes": { "field": "author" },
	"links": {
		"type": "cooccurrence",
		"context": {
			"field": "publication"
		}
	}
}
```

## Complete Node-link Encoding Templates

The examples below provide complete, ready-to-use encodings for each type of node-link diagram, including all default values. Only the properties required to identify the nodes and, when applicable, the links are mandatory. All other properties correspond to default values automatically applied by VENUS and may be omitted unless customization is required.

### Source-target graph (directional or semantic)

```js
encoding: {
  nodes: {
    source: {
      field: "source",
      color: {
        field: "sourceType",
        scale: { type: "ordinal", range: "Set2" },
        legend: { title: "Source Type", display: true, position: "bottom" }
      },
      labels: { display: false },
      tooltip: {
        title: { field: "sourceLabel" },
        fields: ["source", "sourceLabel", "sourceType"]
      }
    },

    target: {
      field: "target",
      color: {
        field: "targetType",
        scale: { type: "ordinal", range: "Set3" },
        legend: { title: "Target Type", display: true, position: "bottom" }
      },
      labels: { display: false },
      tooltip: {
        title: { field: "targetLabel" },
        fields: ["target", "targetLabel", "targetType"]
      }
    },

    // global fallbacks
    size: {
      metric: "degree",
      scale: { type: "linear", range: [6, 24] },
      legend: { title: "Node Degree", display: true, position: "bottom" }
    },
    stroke: { value: "#ffffff", width: 1.5, display: true },
    labels: { display: true },
    tooltip: {
      title: { field: "sourceLabel" },
      fields: ["source", "target"]
    }
  },

  links: {
    // use "directional" for plain directed links,
    // or "semantic" + relation.field for predicate-labeled links
    type: "semantic",
    relation: { field: "predicate" },

    color: {
      field: "predicate",
      scale: { type: "ordinal", range: "Set1" },
      legend: { title: "Relation", display: true, position: "bottom" }
    },

    distance: { value: 110 },
    labels: { display: false, field: "predicate" },
    tooltip: {
      title: { field: "predicate" },
      fields: ["source", "predicate", "target"]
    }
  },

  interactions: {
    tooltip: true,
    drag: true,
    zoom: true,
    nodeDetailsPanel: true
  }
}
```

### Cooccurrence graph

```js
encoding: {
  nodes: {
    field: "author",
    color: {
      field: "authorGroup",
      scale: { type: "ordinal", range: "Tableau10" },
      legend: { title: "Author Group", display: true, position: "bottom" }
    },
    size: {
      metric: "degree",
      scale: { type: "linear", range: [6, 22] },
      legend: { title: "Cooccurrence Degree", display: true, position: "bottom" }
    },
    labels: { display: true, field: "author" },
    stroke: { value: "#ffffff", width: 1.5, display: true },
    tooltip: {
      title: { field: "author" },
      fields: ["author", "authorGroup"]
    }
  },

  links: {
    type: "cooccurrence",
    context: { field: "publication" },
    color: { value: "#999999" },
    distance: { value: 90 },
    labels: { display: false },
    tooltip: {
      title: { field: "publication" },
      fields: ["publication"]
    }
  },

  interactions: {
    tooltip: true,
    drag: true,
    zoom: true,
    nodeDetailsPanel: false
  }
}
```
