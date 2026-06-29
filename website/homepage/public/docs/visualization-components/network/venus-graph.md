# Force-directed graph 

Also known as *Network Graph*, *Network Map*, *Node-Link Diagram*, *Network Diagram*.

This type of visualisation shows how things are interconnected through the use of nodes and link lines to represent their connections and help illuminate the type of relationships between a group of entities. 

Nodes are drawn as circles and links are displayed as simple lines connected between the nodes. Not all of the nodes and links are created equally: additional variables can be visualised, for example, by making the node size or link stroke weight proportion to an assigned value. 

By mapping out connected systems, force-directed graphs can be used to interpret the structure of a graph by looking for any clustering of the nodes, how densely nodes are connected or how the diagram layout is arranged.

Two types of graphs are supported: "undirected" and "directed". Undirected graphs only display the connections between entities, while directed graphs show if the connections are one-way or two-way through small arrows. 

> **Visualization component:** `<venus-graph>`


## Minimal Template

For a minimal force-directed graph, the encoding must at least define `nodes` and `links`. Each `field` refers to a variable from the provided SPARQL `SELECT` query.


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
    nodes: {
      source: { field: "source" },
      target: { field: "target" }
    },
    links: { type: "directional" }
  };

  graph.launch();
</script>
```

## Related Properties

| Encoding Property | Description | Documentation | Mandatory
|---|---|---|:---:|
| `nodes` | Defines node identity and node visual channels (color, size, labels, stroke, tooltip). | [`nodes`](../../encoding/marks/nodes.md) | ✓ 
| `links` | Defines how links are built and styled (type, relation/context, color, distance, tooltip). | [`links`](../../encoding/marks/links.md) | ✓ 
| `interactions` | Controls interaction behavior such as drag, zoom, tooltips, and node details panel. | [`interactions`](../../encoding/interactions.md) | ✗ 
| `color` | Provides color channel semantics used by both nodes and links. | [`color`](../../encoding/color.md) | ✗ 
| `size` | Provides node size channel semantics (`field` or `metric`). | [`size`](../../encoding/size.md) | ✗ 
| `scale` | Defines value-to-visual mapping for data-driven color/size channels. | [`scale`](../../encoding/scale.md) | ✗ 
| `legend` | Controls legend display, position, and compact mode for mapped channels. | [`legend`](../../encoding/legend.md) | ✗ 

Directional and semantic source and target nodes use role blocks such as
`nodes.source.field`, `nodes.target.field`, and role-specific color rules. See the
[`nodes`](../../encoding/marks/nodes.md) encoding reference.

## Graph Construction Modes

`links.type` controls how links are built:

- `directional`: uses `nodes.source.field` and `nodes.target.field`.
- `semantic`: same source-target fields plus `links.relation.field`.
- `cooccurrence`: uses `nodes.field` plus `links.context.field`.

## Force-Graph Specific Options

`<venus-graph>` supports force-layout-specific options:

- `nodes.size.metric: "degree"` (also valid for `nodes.source.size` / `nodes.target.size`)
- `links.distance.value` to tune force-link spacing
- `interactions.drag` to enable/disable node drag-and-drop
- `interactions.zoom` to enable/disable pan and zoom
- `interactions.nodeDetailsPanel` to enable node metadata panel on right click

Example:

```js
encoding: {
  nodes: {
    source: { field: "actorName" },
    target: { field: "movieName" },
    size: {
      metric: "degree",
      scale: { type: "linear", range: [5, 25] },
      legend: { title: "Links Count" }
    }
  },
  links: {
    type: "directional",
    distance: { value: 110 }
  },
  interactions: {
    drag: true,
    zoom: true,
    nodeDetailsPanel: true,
    tooltip: true
  }
}
```
