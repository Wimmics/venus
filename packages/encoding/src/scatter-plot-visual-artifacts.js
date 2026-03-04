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

export function createScatterPlotVisualArtifacts({
  encodingManager,
  encoding,
  rows = [],
  visType = VIS_TYPES.VENUS_SCATTERPLOT
} = {}) {
  const artifacts = {
    scales: new Map(),
    channels: [],
    legends: []
  };
  if (!encodingManager || !encoding) return artifacts;

  const hasPointsConfig = Object.prototype.hasOwnProperty.call(encoding, "points");
  const points = encoding.points || {};
  const pointsEnabled = points.display === undefined ? hasPointsConfig : points.display === true;
  if (!pointsEnabled) return artifacts;

  const pointColor = points.color;
  if (pointColor) {
    const pointColorScaleConfig = pointColor?.field
      ? (pointColor.scale || { type: "ordinal", range: "Accent" })
      : null;
    const pointColorScaleId =
      pointColor?.field && pointColorScaleConfig
        ? makeScaleId(visType, "points", "color", pointColor.field)
        : null;

    if (pointColorScaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        pointColorScaleId,
        pointColorScaleConfig,
        rows,
        pointColor.field,
        true,
        (config, data, field, isColor) => encodingManager.createD3Scale(config, data, field, isColor)
      );
      if (scale) artifacts.scales.set(pointColorScaleId, scale);
    }

    artifacts.channels.push({
      id: "points:color",
      mark: "points",
      channel: "color",
      field: pointColor.field,
      scaleId: pointColorScaleId,
      defaultValue: pointColor.value || "#4e79a7",
      encoding: pointColor
    });

    if (pointColor.field && pointColorScaleId) {
      artifacts.legends.push(
        makeLegendDescriptor(
          "points",
          "color",
          { ...pointColor, scale: pointColorScaleConfig },
          pointColorScaleId,
          "rows"
        )
      );
    }
  }

  const pointSize = points.size;
  if (pointSize) {
    const pointSizeScaleConfig = pointSize?.field
      ? {
          type: "linear",
          range: [2, 10],
          ...(pointSize.scale || {})
        }
      : null;
    const pointSizeScaleId =
      pointSize?.field && pointSizeScaleConfig
        ? makeScaleId(visType, "points", "size", pointSize.field)
        : null;

    if (pointSizeScaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        pointSizeScaleId,
        pointSizeScaleConfig,
        rows,
        pointSize.field,
        false,
        (config, data, field, isColor) => encodingManager.createD3Scale(config, data, field, isColor)
      );
      if (scale) artifacts.scales.set(pointSizeScaleId, scale);
    }

    artifacts.channels.push({
      id: "points:size",
      mark: "points",
      channel: "size",
      field: pointSize.field,
      scaleId: pointSizeScaleId,
      defaultValue:
        typeof pointSize.value === "number" && !Number.isNaN(pointSize.value) && pointSize.value > 0
          ? pointSize.value
          : 4,
      encoding: pointSize
    });

    if (pointSize.field && pointSizeScaleId) {
      artifacts.legends.push(
        makeLegendDescriptor(
          "points",
          "size",
          { ...pointSize, scale: pointSizeScaleConfig },
          pointSizeScaleId,
          "rows"
        )
      );
    }
  }

  return artifacts;
}
