# Encoding

The encoding underpins most stages of the visualization pipeline, from data transformation to user interaction. VENUS adopts a Vega-inspired declarative specification to map SPARQL SELECT variables to marks (e.g., circles, bars) and visual channels (e.g., color, size). 

The encoding is a property of the visualization component used to configure the output visualization. For instance:

```js
const component = document.querySelector('venus-graph')

component.encoding = { ... }
```

The encoding supports the following elements:

- **Data fields** are the variables returned by the SPARQL query (i.e. contained in the SPARQL JSON results).  
  They answer the question: *What data should be represented?*  <br>
  See [Data Fields](./datafields.md) for more details.

- **Marks** are the graphical elements used to represent the data, such as `lines`, `nodes`, `links`, `bars`, or `points`.  
  They answer the question: *What should be drawn?*<br>
  See [Marks](./marks.md) for more details.

- **Layout properties** control the *position and arrangement* of marks.  
  They answer questions such as: *Where should this mark be placed?* or *How should the marks be arranged?*  <br>
  **Example:** in a bar chart, `x` and `y` determine the horizontal and vertical position of the bars.<br>
  Each visualization technique supports different layout properties according to its characteristics.<br>
  See [Visualization Components](../visualization-components/start.md) for details and supported layout properties per visualization technique.

- **Visual variables** control the *appearance* of marks. Their appearance can be fixed or can change according to the data.  
  They answer questions such as: *What color, size, shape, or transparency should this mark have?*  <br>
  **Example:** `color` can use a data field to give marks different colors depending on their category.<br>
  See [Visual variables](./channels.md) for more details.

- **Annotations** add *information or explanations* to the visualization.  
  They answer questions such as: *What additional information should be shown?*  <br>
  **Examples:** `labels` that display the name or value directly next to a mark, and `tooltips` that display additional information when the user hovers over a mark with the mouse cursor.<br>
  See [Annotations](./annotations.md) for more details.

- **Interactions** control *how users can interact* with the visualization.  
  They answer questions such as: *What can the user do with the visualization?*  <br>
  **Examples:** users can `zoom` in or out to see more or less detail, or `drag` elements to move them.<br>
  See [Interaction](./interactions.md) for more details.



