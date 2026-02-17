import { VIS_TYPES } from "@wimmics/venus-core";

function makeScaleId(visType, mark, channel, field) {
  return `${visType}:${mark}:${channel}:${field || "value"}`;
}

function makeLegendDescriptor(mark, channel, encoding, scaleId, dataKey) {
  const legend = encoding?.legend || {};
  const display = legend.display !== false;
  const title =
    typeof legend.title === "string" && legend.title.trim()
      ? legend.title
      : encoding?.field || "Legend";
  const position =
    typeof legend.position === "string" && legend.position.trim()
      ? legend.position
      : "bottom";

  return {
    id: `${mark}:${channel}:${encoding?.field || "value"}`,
    type: channel,
    mark,
    channel,
    field: encoding?.field,
    scaleId,
    title,
    position,
    display,
    dataKey,
    encoding
  };
}

export function createBarChartVisualArtifacts({
  encodingManager,
  encoding,
  rows = [],
  visType = VIS_TYPES.BAR_CHART
} = {}) {
  const artifacts = {
    scales: new Map(),
    channels: [],
    legends: []
  };
  if (!encodingManager || !encoding) return artifacts;

  const color = encoding.color;
  if (color) {
    const scaleId = color?.field && color?.scale ? makeScaleId(visType, "bars", "color", color.field) : null;

    if (scaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        scaleId,
        color.scale,
        rows,
        color.field,
        true,
        (config, data, field, isColor) => encodingManager.createD3Scale(config, data, field, isColor)
      );
      if (scale) artifacts.scales.set(scaleId, scale);
    }

    artifacts.channels.push({
      id: "bars:color",
      mark: "bars",
      channel: "color",
      field: color.field,
      scaleId,
      defaultValue: color.value || "#69b3a2",
      encoding: color
    });

    if (color.field && color.scale && scaleId) {
      artifacts.legends.push(makeLegendDescriptor("bars", "color", color, scaleId, "rows"));
    }
  }

  return artifacts;
}
