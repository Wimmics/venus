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
    property: "labels",
    mode: "replaceLabelsText",
    value: {
      value: "Mark label"
    }
  },
  labelByField: {
    id: "labelByField",
    label: "Label by field",
    property: "labels",
    mode: "replaceLabelsText",
    value: {
      field: ""
    }
  },
  cooccurrenceNodeFields: {
    id: "cooccurrenceNodeFields",
    label: "Co-occurrence node fields",
    mode: "mergeRoot",
    path: ["nodes"],
    value: {
      nodes: {
        field: "node"
      },
      links: {
        type: "cooccurrence",
        context: {
          field: "group"
        }
      }
    }
  },
  sourceTargetNodeFields: {
    id: "sourceTargetNodeFields",
    label: "Source and target fields",
    mode: "mergeRoot",
    path: ["nodes"],
    value: {
      nodes: {
        source: {
          field: "source"
        },
        target: {
          field: "target"
        }
      },
      links: {
        type: "directional"
      }
    }
  },
  removeCooccurrenceNodeFields: {
    id: "removeCooccurrenceNodeFields",
    label: "Remove co-occurrence fields",
    mode: "remove",
    path: ["nodes", "field"],
    paths: [
      ["nodes", "field"],
      ["links", "context"],
      ["links", "type"]
    ]
  },
  removeSourceTargetNodeFields: {
    id: "removeSourceTargetNodeFields",
    label: "Remove source and target fields",
    mode: "remove",
    path: ["nodes", "source"],
    paths: [
      ["nodes", "source"],
      ["nodes", "target"],
      ["links", "relation"],
      ["links", "type"]
    ]
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
  nodeStroke: {
    id: "nodeStroke",
    label: "Stroke",
    property: "stroke",
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

function variant(id, label, snippet) {
  return { id, label, snippet };
}

function property(id, label, variants) {
  return { id, label, variants };
}

function singleProperty(id, label, snippet, variantLabel = "Add") {
  return property(id, label, [variant(id, variantLabel, snippet)]);
}

function visualizationRootProperties() {
  return VISUALIZATION_SCOPE.properties
}

const VISUALIZATION_SCOPE = Object.freeze({
  id: "visualization",
  label: "Visualization",
  properties: [
    singleProperty("title", "Title", SNIPPETS.title),
    singleProperty("background", "Background", SNIPPETS.background),
    singleProperty("tooltip-interaction", "Tooltip interaction", SNIPPETS.tooltipInteraction)
  ]
});

function labelsProperty(snippetFor) {
  return property("labels", "Labels", [
    variant("constant", "Constant", snippetFor("constantLabel")),
    variant("field", "By field", snippetFor("labelByField"))
  ]);
}

function colorProperty(snippetFor, { metric = false } = {}) {
  const variants = [
    variant("constant", "Constant", snippetFor("constantColor")),
    variant("field", "By field", snippetFor("colorByField"))
  ];
  if (metric) variants.push(variant("degree", "By degree", snippetFor("colorByDegree")));
  return property("color", "Color", variants);
}

function sizeProperty(snippetFor, { metric = false } = {}) {
  const variants = [
    variant("constant", "Constant", snippetFor("constantSize")),
    variant("field", "By field", snippetFor("sizeByField"))
  ];
  if (metric) variants.push(variant("degree", "By degree", snippetFor("sizeByDegree")));
  return property("size", "Size", variants);
}

function tooltipProperty(snippetFor) {
  return property("tooltip", "Tooltip", [
    variant("title-field", "Title by field", snippetFor("tooltipTitleByField")),
    variant("fields", "Fields", snippetFor("tooltipFields"))
  ]);
}

function markProperties(snippetFor, options = {}) {
  return [
    labelsProperty(snippetFor),
    colorProperty(snippetFor, options),
    ...(options.size === false ? [] : [sizeProperty(snippetFor, options)]),
    tooltipProperty(snippetFor)
  ];
}

function markScope(id, label, mark, options = {}, extraProperties = []) {
  return {
    id,
    label,
    properties: [
      ...markProperties((snippetId) => atMark(mark, snippetId), options),
      ...extraProperties
    ]
  };
}

const AXES_SCOPE = Object.freeze({
  id: "axes",
  label: "Axes",
  properties: [
    singleProperty("x-title", "X axis title", atAxis("x", "axisTitle")),
    singleProperty("y-title", "Y axis title", atAxis("y", "axisTitle"))
  ]
});

function isGraphDirected(encoding){
  const hasNodeField = encoding?.nodes?.field !== undefined;
  const hasSourceTargetFields =
    encoding?.nodes?.source !== undefined || encoding?.nodes?.target !== undefined;
  return hasSourceTargetFields
}

function graphNodesScope() {
  return {
    id: "all",
    label: "Nodes",
    properties: [
      ...markProperties((snippetId) => atMark("nodes", snippetId), { metric: true }),
      singleProperty("stroke", "Stroke", SNIPPETS.nodeStroke)
    ]
  }
}

function graphSourceScope() {
  return {
    id: "source",
    label: "Source",
    properties: [
      ...markProperties((snippetId) => atNodeRole("source", snippetId)),
      singleProperty("stroke", "Stroke", atNodeRole("source", "nodeStroke"))
    ]
  }
}

function graphTargetScope() {
  return {
    id: "target",
    label: "Target",
    properties: [
      ...markProperties((snippetId) => atNodeRole("target", snippetId)),
      singleProperty("stroke", "Stroke", atNodeRole("target", "nodeStroke"))
    ]
  }
}

export function getEncodingAddPicker(component, encoding = {}) {
  if (component === "venus-graph") {
    let nodesScope = []
    if (isGraphDirected(encoding)) 
      nodesScope = [graphSourceScope(), graphTargetScope()]
    else nodesScope = [graphNodesScope()]

    return {
      scopes: [
        ...visualizationRootProperties(),
        markScope("links", "Links", "links", {}, [
          singleProperty("width", "Width", SNIPPETS.linkWidth),
          singleProperty("distance", "Distance", SNIPPETS.linkDistance)
        ])
      ].concat(nodesScope)
    };
  }

  if (component === "venus-barchart") {
    return {
      scopes: [
        ...visualizationRootProperties(),
        AXES_SCOPE,
        markScope("bars", "Bars", "bars", { size: false }, [
          singleProperty("groups", "Grouping", SNIPPETS.barGroups),
          singleProperty("stack", "Stacking", SNIPPETS.barStack)
        ])
      ]
    };
  }

  if (component === "venus-linechart") {
    return {
      scopes: [
        ...visualizationRootProperties(),
        AXES_SCOPE,
        markScope("lines", "Lines", "lines", {}, [
          singleProperty("series", "Series grouping", SNIPPETS.lineGroup)
        ]),
        markScope("points", "Points", "points", {}, [
          singleProperty("display", "Display", SNIPPETS.pointsDisplay)
        ])
      ]
    };
  }

  if (component === "venus-scatterplot") {
    return {
      scopes: [...visualizationRootProperties(), AXES_SCOPE, markScope("points", "Points", "points")]
    };
  }

  return { scopes: [VISUALIZATION_SCOPE] };
}
