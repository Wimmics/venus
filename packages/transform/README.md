# @wimmics/venus-transform

Transforms raw SPARQL JSON results into visualization-ready data structures.

Provides the data transformation layer that converts SPARQL query results into canonical data formats for each visualization type. Handles field extraction, aggregation, and structure creation required for rendering.

## Responsibilities

- **Data Transformation**: Converts SPARQL results to visualization-specific formats
- **Factory Function**: Provides factory for creating visualization-specific mappers
- **Field Mapping**: Extracts and maps SPARQL result fields to visualization data properties
- **Label Resolution**: Extracts stable labels from URI/literal bindings
- **Data Structure Creation**: Builds canonical structures for each visualization type
- **Encoding Integration**: Accesses encoding specification for field selection

## Installation

```bash
npm install @wimmics/venus-transform
```

## Quick Start

### Using the Factory Function

```js
import { createSparqlMapper } from '@wimmics/venus-transform';
import { VIS_TYPES } from '@wimmics/venus-core';

// Create a mapper for bar charts
const mapper = createSparqlMapper(VIS_TYPES.VENUS_BARCHART);

// Raw SPARQL results
const sparqlResults = {
  head: { vars: ['category', 'value', 'region'] },
  results: { bindings: [
    { category: { value: 'Q1' }, value: { value: '100' }, region: { value: 'East' } },
    { category: { value: 'Q2' }, value: { value: '150' }, region: { value: 'West' } }
  ]}
};

// Transform with encoding
const encoding = {
  x: { field: 'category' },
  y: { field: 'value' },
  bars: { color: { field: 'region' } }
};

try {
  const mappedData = mapper.map(sparqlResults, { encoding });
  console.log(mappedData);
  // { rows: [...], chart: {...} }
} catch (error) {
  console.error('Mapping error:', error.message);
}
```

## Visualization Types

All 5 VENUS visualization types are supported with type-specific data structures:

| Type | Mapper | Output Format |
|------|--------|---------------|
| Bar Chart | `SparqlToBarChartMapper` | `{ rows: [...], chart: {...} }` |
| Line Chart | `SparqlToLineChartMapper` | `{ rows: [...], chart: {...} }` |
| Scatter Plot | `SparqlToScatterPlotMapper` | `{ rows: [...], chart: {...} }` |
| Force Graph | `SparqlToForceGraphMapper` | `{ nodes: [...], links: [...] }` |
| Sankey | `SparqlToSankey` | `{ nodes: [...], links: [...] }` |

## Mapper Types

### Cartesian Mappers (Bar, Line, Scatter)

Cartesian visualizations use row-based data structures:

```js
{
  rows: [
    { category: 'Q1', value: 100, region: 'East', ...otherFields },
    { category: 'Q2', value: 150, region: 'West', ...otherFields }
  ],
  chart: {
    // Visualization-specific metadata
  }
}
```

### Graph Mappers (Force Graph, Sankey)

Graph visualizations use node-link structures:

```js
{
  nodes: [
    { id: 'node1', label: 'Label 1', type: 'A', ...properties },
    { id: 'node2', label: 'Label 2', type: 'B', ...properties }
  ],
  links: [
    { source: 'node1', target: 'node2', weight: 10, ...properties },
    { source: 'node2', target: 'node1', weight: 5, ...properties }
  ]
}
```

## API Reference

### Main Export

```js
export function createSparqlMapper(visType, options) -> SparqlToVisMapper
```

Creates a visualization-type-specific data mapper.

**Parameters:**
- `visType` (string): Visualization type (e.g., `VIS_TYPES.VENUS_BARCHART`)
- `options` (Object, optional): Mapper configuration

**Returns:** SparqlToVisMapper instance (type-specific subclass)

### Mapper Methods

#### `map(sparqlResults, context)`
Transforms SPARQL results into visualization-ready data structure.

**Parameters:**
- `sparqlResults` (Object): SPARQL JSON results
  - `head.vars` (string[]): Variable names
  - `results.bindings` (Object[]): Variable bindings
- `context` (Object):
  - `encoding` (Object): Visual encoding specification (guides field selection)

**Returns:** Object with visualization-specific structure

**Throws:** Error if SPARQL format is invalid or transformation fails

## Data Transformation Process

Each mapper follows this general process:

1. **Validate** SPARQL result structure
2. **Extract** variable bindings from results
3. **Map** SPARQL fields to visualization fields using encoding
4. **Resolve** labels from URI/literal values
5. **Aggregate** or transform data as needed for visualization type
6. **Return** canonical data structure

### Example: Bar Chart Transformation

```js
// SPARQL results
{
  head: { vars: ['year', 'revenue'] },
  results: { bindings: [
    { year: { value: '2020' }, revenue: { value: '1000' } },
    { year: { value: '2021' }, revenue: { value: '1500' } }
  ]}
}

// Encoding specifies fields
{ x: { field: 'year' }, y: { field: 'revenue' } }

// Output
{
  rows: [
    { year: 2020, revenue: 1000 },
    { year: 2021, revenue: 1500 }
  ],
  chart: { /* metadata */ }
}
```

### Example: Graph Transformation

```js
// SPARQL results for graph edges
{
  head: { vars: ['source', 'target', 'weight'] },
  results: { bindings: [
    { source: { value: 'http://example.org/A' }, 
      target: { value: 'http://example.org/B' },
      weight: { value: '10' } }
  ]}
}

// Output with nodes extracted and links created
{
  nodes: [
    { id: 'http://example.org/A', label: 'A' },
    { id: 'http://example.org/B', label: 'B' }
  ],
  links: [
    { source: 'http://example.org/A', target: 'http://example.org/B', weight: 10 }
  ]
}
```

## Field Mapping

Mappers extract fields specified in the encoding:

```js
const encoding = {
  x: { field: 'year' },       // Maps SPARQL 'year' variable
  y: { field: 'revenue' },    // Maps SPARQL 'revenue' variable
  bars: {
    color: { field: 'region'} // Optional color field
  }
};

// Mapper includes year, revenue, and region in output rows
```

## Label Resolution

URIs and literals are converted to displayable labels:

```js
// SPARQL binding
{ personLabel: { value: 'Albert Einstein' } }
// OR
{ person: { value: 'http://dbpedia.org/resource/Albert_Einstein' } }

// Both become label: 'Albert Einstein' (or shortened URI)
```

## Related Packages

- [@wimmics/venus-core](../core) - Shared types (VIS_TYPES)
- [@wimmics/venus-encoding](../encoding) - Encoding specification
- [@wimmics/venus-visual-mapping](../visual-mapping) - Uses transformed data
- [@wimmics/venus-rendering](../rendering) - Renders transformed data
- [@wimmics/venus-components](../components) - Web component layer

## See Also

- [Full Visualization Documentation](https://wimmics.github.io/venus/)
- [SPARQL Query Language](https://www.w3.org/TR/sparql11-query/)

## License

See LICENSE in the repository root.
