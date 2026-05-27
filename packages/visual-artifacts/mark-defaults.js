const COMMON_DEFAULTS = {
  interactions: {
    tooltip: true
  },
  axis: {
    labelAngle: 0
  },
  legend: {
    display: true,
    position: "bottom"
  }
}

export const MARK_DEFAULTS = {
  bars: {
    color: { value: "#69b3a2" },
    size: { value: 0 },
    legend: COMMON_DEFAULTS.legend
  },

  points: {
    display: true,
    color: { value: "#4e79a7" },
    size: { value: 4 },
    legend: COMMON_DEFAULTS.legend
  },

  lines: {
    color: { value: "#4e79a7" },
    size: { value: 2 },
    legend: COMMON_DEFAULTS.legend
  },

  nodes: {
    color: { value: "#69b3a2" },
    size: {
      metric: "degree",
      scale: {
        type: "linear",
        range: [8, 25]
      }
    },
    stroke: {
      color: { value: "#ffffff"},
      width: { value: 1.5}, 
      display: true
    },
    labels: {
      display: true
    },
    legend: COMMON_DEFAULTS.legend
  },

  links: {
    color: { value: "#999" },
    size: { value: 1.5 },
    distance: { value: 100 },
    legend: COMMON_DEFAULTS.legend
  }
};