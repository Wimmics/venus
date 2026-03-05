# Network-based visualizations

Network-based visualizations represent relationships among entities. They model data as **nodes** (entities) connected by **links** (relationships), making them particularly suitable for knowledge graph exploration, network analysis, and relational data.

These techniques emphasize structure, connectivity patterns, and topology rather than purely quantitative comparison. They are especially relevant when the primary analytical task is to understand how elements are connected, grouped, or organized within a network.

## When to Use

Network-based visualizations are appropriate when:

- Relationships are more important than individual values.
- Connectivity, paths, or clusters must be analyzed.
- Hierarchical or flow structures need to be exposed.

## Included Techniques

VENUS currently supports the following network-based visualization techniques:

- **Force-directed graph (`venus-graph`):** General-purpose network layout where node positions are computed using physical simulation to reveal structure and clusters.

Each technique shares the same data access model in VENUS (SPARQL + encoding) but differs in layout strategy and visual semantics.


