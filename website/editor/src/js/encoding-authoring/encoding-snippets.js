const SNIPPETS = Object.freeze({
  title: {
    id: "title",
    label: "Title",
    path: ["title"],
    value: "Visualization title"
  },
  background: {
    id: "background",
    label: "Background",
    path: ["background"],
    value: "#ffffff"
  },
  tooltipInteraction: {
    id: "tooltipInteraction",
    label: "Tooltip interaction",
    path: ["interactions", "tooltip"],
    value: true
  },
  constantLabel: {
    id: "constantLabel",
    label: "Constant label",
    property: "label",
    mode: "replace",
    value: "Mark label"
  },
  labelByField: {
    id: "labelByField",
    label: "Label by field",
    property: "label",
    mode: "replace",
    value: {
      field: ""
    }
  },
  constantColor: {
    id: "constantColor",
    label: "Constant color",
    property: "color",
    mode: "replace",
    value: {
      value: "#69b3a2"
    }
  },
  colorByField: {
    id: "colorByField",
    label: "Color by field",
    property: "color",
    mode: "replace",
    value: {
      field: "",
      scale: {
        type: "ordinal"
      }
    }
  },
  colorByDegree: {
    id: "colorByDegree",
    label: "Color by degree",
    property: "color",
    mode: "replace",
    value: {
      metric: "degree",
      scale: {
        type: "sequential",
        range: "Viridis"
      }
    }
  },
  constantSize: {
    id: "constantSize",
    label: "Constant size",
    property: "size",
    mode: "replace",
    value: {
      value: 4
    }
  },
  sizeByField: {
    id: "sizeByField",
    label: "Size by field",
    property: "size",
    mode: "replace",
    value: {
      field: "",
      scale: {
        type: "linear",
        range: [2, 10]
      }
    }
  },
  sizeByDegree: {
    id: "sizeByDegree",
    label: "Size by degree",
    property: "size",
    mode: "replace",
    value: {
      metric: "degree",
      scale: {
        type: "linear",
        range: [5, 25]
      }
    }
  },
  tooltipFields: {
    id: "tooltipFields",
    label: "Tooltip fields",
    property: "tooltip",
    value: {
      fields: [""]
    }
  },
  tooltipTitleByField: {
    id: "tooltipTitleByField",
    label: "Tooltip title by field",
    property: "tooltip",
    value: {
      title: {
        field: ""
      }
    }
  },
  axisTitle: {
    id: "axisTitle",
    label: "Axis title",
    property: "axis",
    value: {
      title: {
        value: "",
        display: true
      }
    }
  },
  barGroups: {
    id: "barGroups",
    label: "Grouping",
    path: ["bars", "groups"],
    value: {
      field: "group"
    }
  },
  barStack: {
    id: "barStack",
    label: "Stacking",
    path: ["bars", "stack"],
    value: true
  },
  lineGroup: {
    id: "lineGroup",
    label: "Series grouping",
    path: ["lines", "group"],
    value: {
      field: "series"
    }
  },
  pointsDisplay: {
    id: "pointsDisplay",
    label: "Points display",
    path: ["points", "display"],
    value: true
  },
  nodeLabels: {
    id: "nodeLabels",
    label: "Labels",
    path: ["nodes", "labels"],
    value: {
      display: true
    }
  },
  nodeStroke: {
    id: "nodeStroke",
    label: "Stroke",
    path: ["nodes", "stroke"],
    value: {
      value: "#ffffff",
      width: 1.5,
      display: true
    }
  },
  linkWidth: {
    id: "linkWidth",
    label: "Width",
    path: ["links", "width"],
    value: {
      value: 1.5
    }
  },
  linkDistance: {
    id: "linkDistance",
    label: "Distance",
    path: ["links", "distance"],
    value: 100
  }
});

function atMark(mark, snippetId) {
  const snippet = SNIPPETS[snippetId];
  return {
    ...snippet,
    path: [mark, snippet.property]
  };
}

function atAxis(axis, snippetId) {
  const snippet = SNIPPETS[snippetId];
  return {
    ...snippet,
    label: `${axis.toUpperCase()} ${snippet.label.toLowerCase()}`,
    path: [axis, snippet.property]
  };
}

function atNodeRole(role, snippetId) {
  const snippet = SNIPPETS[snippetId];
  return {
    ...snippet,
    path: ["nodes", role, snippet.property]
  };
}

const COMMON_GROUP = Object.freeze({
  id: "top-level",
  label: "Top level",
  items: [SNIPPETS.title, SNIPPETS.background, SNIPPETS.tooltipInteraction]
});

export function getEncodingSnippetGroups(component) {
  if (component === "venus-graph") {
    return [
      COMMON_GROUP,
      {
        id: "nodes",
        label: "Nodes",
        items: [
          atMark("nodes", "constantLabel"),
          atMark("nodes", "labelByField"),
          atMark("nodes", "constantColor"),
          atMark("nodes", "colorByField"),
          atMark("nodes", "colorByDegree"),
          atMark("nodes", "constantSize"),
          atMark("nodes", "sizeByField"),
          atMark("nodes", "sizeByDegree"),
          atMark("nodes", "tooltipTitleByField"),
          atMark("nodes", "tooltipFields"),
          SNIPPETS.nodeLabels,
          SNIPPETS.nodeStroke
        ]
      },
      {
        id: "links",
        label: "Links",
        items: [
          atMark("links", "constantLabel"),
          atMark("links", "labelByField"),
          atMark("links", "constantColor"),
          atMark("links", "colorByField"),
          atMark("links", "tooltipTitleByField"),
          atMark("links", "tooltipFields"),
          SNIPPETS.linkWidth,
          SNIPPETS.linkDistance
        ]
      },
      {
        id: "source-nodes",
        label: "Source nodes",
        items: [
          atNodeRole("source", "constantLabel"),
          atNodeRole("source", "labelByField"),
          atNodeRole("source", "constantColor"),
          atNodeRole("source", "colorByField"),
          atNodeRole("source", "constantSize"),
          atNodeRole("source", "sizeByField"),
          atNodeRole("source", "tooltipTitleByField"),
          atNodeRole("source", "tooltipFields")
        ]
      },
      {
        id: "target-nodes",
        label: "Target nodes",
        items: [
          atNodeRole("target", "constantLabel"),
          atNodeRole("target", "labelByField"),
          atNodeRole("target", "constantColor"),
          atNodeRole("target", "colorByField"),
          atNodeRole("target", "constantSize"),
          atNodeRole("target", "sizeByField"),
          atNodeRole("target", "tooltipTitleByField"),
          atNodeRole("target", "tooltipFields")
        ]
      }
    ];
  }

  if (component === "venus-barchart") {
    return [
      COMMON_GROUP,
      {
        id: "axes",
        label: "Axes",
        items: [atAxis("x", "axisTitle"), atAxis("y", "axisTitle")]
      },
      {
        id: "bars",
        label: "Bars",
        items: [
          atMark("bars", "constantLabel"),
          atMark("bars", "labelByField"),
          atMark("bars", "constantColor"),
          atMark("bars", "colorByField"),
          atMark("bars", "constantSize"),
          atMark("bars", "sizeByField"),
          atMark("bars", "tooltipTitleByField"),
          atMark("bars", "tooltipFields"),
          SNIPPETS.barGroups,
          SNIPPETS.barStack
        ]
      }
    ];
  }

  if (component === "venus-linechart") {
    return [
      COMMON_GROUP,
      {
        id: "axes",
        label: "Axes",
        items: [atAxis("x", "axisTitle"), atAxis("y", "axisTitle")]
      },
      {
        id: "lines",
        label: "Lines",
        items: [
          atMark("lines", "constantLabel"),
          atMark("lines", "labelByField"),
          atMark("lines", "constantColor"),
          atMark("lines", "colorByField"),
          atMark("lines", "constantSize"),
          atMark("lines", "sizeByField"),
          atMark("lines", "tooltipTitleByField"),
          atMark("lines", "tooltipFields"),
          SNIPPETS.lineGroup
        ]
      },
      {
        id: "points",
        label: "Points",
        items: [
          SNIPPETS.pointsDisplay,
          atMark("points", "constantLabel"),
          atMark("points", "labelByField"),
          atMark("points", "constantColor"),
          atMark("points", "colorByField"),
          atMark("points", "constantSize"),
          atMark("points", "sizeByField"),
          atMark("points", "tooltipTitleByField"),
          atMark("points", "tooltipFields")
        ]
      }
    ];
  }

  if (component === "venus-scatterplot") {
    return [
      COMMON_GROUP,
      {
        id: "axes",
        label: "Axes",
        items: [atAxis("x", "axisTitle"), atAxis("y", "axisTitle")]
      },
      {
        id: "points",
        label: "Points",
        items: [
          atMark("points", "constantLabel"),
          atMark("points", "labelByField"),
          atMark("points", "constantColor"),
          atMark("points", "colorByField"),
          atMark("points", "constantSize"),
          atMark("points", "sizeByField"),
          atMark("points", "tooltipTitleByField"),
          atMark("points", "tooltipFields")
        ]
      }
    ];
  }

  return [COMMON_GROUP];
}
