# Force-directed graph 

Also known as *Network Graph*, *Network Map*, *Node-Link Diagram*, *Network Diagram*.

This type of visualisation shows how things are interconnected through the use of nodes and link lines to represent their connections and help illuminate the type of relationships between a group of entities. 

Nodes are drawn as circles and links are displayed as simple lines connected between the nodes. Not all of the nodes and links are created equally: additional variables can be visualised, for example, by making the node size or link stroke weight proportion to an assigned value. 

By mapping out connected systems, force-directed graphs can be used to interpret the structure of a graph by looking for any clustering of the nodes, how densely nodes are connected or how the diagram layout is arranged.

Two types of graphs are supported: "undirected" and "directed". Undirected graphs only display the connections between entities, while directed graphs show if the connections are one-way or two-way through small arrows. 

> **Visualization component:** `<vis-graph>`


## Minimal Template

For a minimal force-directed graph, the encoding must at least define `nodes` and `links`. Each `field` refers to a variable from the provided SPARQL `SELECT` query.


```html
<vis-graph id="graph" width="100%" height="520"></vis-graph>

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
    nodes: { field: "source"}, 
    links: { field: "target" } 
  };

  graph.launch();
</script>
```

## Related Properties

| Encoding Property | Description | Documentation | Mandatory
|---|---|---|:---:|
| `nodes` | Defines node identity and node visual channels (color, size, labels, stroke). | [`nodes`](../encoding/nodes.md) | ✓ 
| `links` | Defines how links are built and styled (field mapping, color, distance, width). | [`links`](../encoding/links.md) | ✓ 
| `interactions` | Controls interaction behavior such as drag, zoom, tooltips, and node details panel. | [`interactions`](../encoding/interactions.md) | ✗ 
| `color` | Provides color channel semantics used by both nodes and links. | [`color`](../encoding/color.md) | ✗ 
| `scale` | Defines value-to-visual mapping for data-driven color/size channels. | [`scale`](../encoding/scale.md) | ✗ 
| `legend` | Controls legend display, position, and compact mode for mapped channels. | [`legend`](../encoding/legend.md) | ✗ 
