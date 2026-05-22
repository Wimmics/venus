import barChartDefaultEncoding from "../defaults/bar-chart.json" with { type: "json" };
import forceGraphDefaultEncoding from "../defaults/force-graph.json" with { type: "json" };
import lineChartDefaultEncoding from "../defaults/line-chart.json" with { type: "json" };
import scatterPlotDefaultEncoding from "../defaults/scatter-plot.json" with { type: "json" };

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }

  return Object.freeze(value);
}

export const DEFAULT_ENCODING_TEMPLATES = Object.freeze({
  "bar-chart": deepFreeze(barChartDefaultEncoding),
  "force-graph": deepFreeze(forceGraphDefaultEncoding),
  "line-chart": deepFreeze(lineChartDefaultEncoding),
  "scatter-plot": deepFreeze(scatterPlotDefaultEncoding)
});

export function getDefaultEncodingTemplate(type) {
  const template = DEFAULT_ENCODING_TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown default encoding template "${type}".`);
  }

  // Encodings are modified by adaptive derivation and by chart consumers.
  return JSON.parse(JSON.stringify(template));
}
