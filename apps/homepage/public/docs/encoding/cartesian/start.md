# Cartesian visualizations

Cartesian visualizations represent data using positional encodings along orthogonal axes (typically **x** and **y**). They map variables to spatial coordinates to support quantitative comparison, trend analysis, and distribution assessment.

These techniques emphasize magnitude, ordering, and variation across dimensions rather than structural relationships. They are particularly appropriate when the analytical task focuses on comparing values, identifying trends, or examining distributions.

## When to Use

Cartesian visualizations are appropriate when:

- Quantitative comparison between values is required.
- Trends over an ordered dimension (e.g., time) must be analyzed.
- Distributions or rankings need to be examined.
- Relationships between numerical variables should be assessed.

## Included Techniques

VENUS currently supports the following Cartesian visualization techniques:

- **Bar chart (`vis-barchart`):** Compares discrete categories using rectangular marks whose length encodes magnitude.

<!-- - **Line chart (`vis-linechart`)** *(if applicable)*: Displays trends across an ordered or continuous dimension.

- **Scatter plot (`vis-scatterplot`)** *(if applicable)*: Shows relationships between two quantitative variables. -->

Each technique shares the same data access model in VENUS (SPARQL + encoding) but differs in mark type and visual semantics.

## Encoding Properties

Cartesian visualizations expose additional encoding properties dedicated to positional layouts and mark arrangement. These properties complement the common encoding options and are described in detail below.

| Property |  | Description |
|---|---|---|
| [`x`](./x.md) |  | Defines the horizontal positional encoding. |
| [`y`](./y.md) |  | Defines the vertical positional encoding. |
| [`direction`](./direction.md) |  | Controls the orientation of marks (e.g., bar direction). |
| [`groups`](./groups.md) |  | Defines the field used to split grouped or stacked bars. |
| [`stack`](./stack.md) |  | Defines how marks are grouped or stacked. |
