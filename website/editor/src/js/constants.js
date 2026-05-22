export const SCENARIO_INDEX_PATH = "./examples/scenarios.index.json";
export const STORAGE_KEY = "venus.editor.selectedScenarioId";

export const VISUALIZATION_TEMPLATES = Object.freeze([
  {
    id: "force-graph-directed",
    label: "Force-directed graph",
    component: "venus-graph",
    encodingPath: "./templates/encodings/force-graph/directed.json"
  },
  {
    id: "force-graph-co-occurrence",
    label: "Co-occurrence graph",
    component: "venus-graph",
    encodingPath: "./templates/encodings/force-graph/co-occurrence.json"
  },
  {
    id: "bar-chart-simple",
    label: "Bar Chart",
    component: "venus-barchart",
    encodingPath: "./templates/encodings/bar-chart/simple.json"
  },
  {
    id: "bar-chart-grouped",
    label: "Grouped Bar Chart",
    component: "venus-barchart",
    encodingPath: "./templates/encodings/bar-chart/grouped.json"
  },
  {
    id: "bar-chart-stacked",
    label: "Stacked Bar Chart",
    component: "venus-barchart",
    encodingPath: "./templates/encodings/bar-chart/stacked.json"
  },
  {
    id: "line-chart-simple",
    label: "Line Chart",
    component: "venus-linechart",
    encodingPath: "./templates/encodings/line-chart/simple.json"
  },
  {
    id: "line-chart-multi-line",
    label: "Multi-line Chart",
    component: "venus-linechart",
    encodingPath: "./templates/encodings/line-chart/multi-line.json"
  },
  {
    id: "scatter-plot-simple",
    label: "Scatter Plot",
    component: "venus-scatterplot",
    encodingPath: "./templates/encodings/scatter-plot/simple.json"
  },
  {
    id: "scatter-plot-bubble",
    label: "Bubble Plot",
    component: "venus-scatterplot",
    encodingPath: "./templates/encodings/scatter-plot/bubble.json"
  }
]);

export const DEFAULT_CUSTOM_TEMPLATE_ID = "force-graph-directed";
