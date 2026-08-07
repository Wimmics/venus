export const VIS_TYPES = Object.freeze({
  VENUS_GRAPH: "venus-graph",
  VENUS_BARCHART: "venus-barchart",
  VENUS_LINECHART: "venus-linechart",
  VENUS_SCATTERPLOT: "venus-scatterplot",
  VENUS_SANKEY: "venus-sankey"
});

export function isCartesianVis(visType){
  return [VIS_TYPES.VENUS_BARCHART, VIS_TYPES.VENUS_SCATTERPLOT, VIS_TYPES.VENUS_LINECHART].includes(visType)
}

export function isNetworkVis(visType) {
  return [VIS_TYPES.VENUS_GRAPH, VIS_TYPES.VENUS_SANKEY].includes(visType)
}
