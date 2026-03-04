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

export function createLineChartVisualArtifacts({
  encodingManager,
  encoding,
  rows = [],
  visType = VIS_TYPES.VENUS_LINECHART
} = {}) {
  const artifacts = {
    scales: new Map(),
    channels: [],
    legends: []
  };
  if (!encodingManager || !encoding) return artifacts;

  const lines = encoding.lines || {};
  const color = lines.color;
  if (color) {
    const colorScaleConfig = color?.field ? (color.scale || { type: "ordinal", range: "Accent" }) : null;
    const scaleId = color?.field && colorScaleConfig ? makeScaleId(visType, "lines", "color", color.field) : null;

    if (scaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        scaleId,
        colorScaleConfig,
        rows,
        color.field,
        true,
        (config, data, field, isColor) => encodingManager.createD3Scale(config, data, field, isColor)
      );
      if (scale) artifacts.scales.set(scaleId, scale);
    }

    artifacts.channels.push({
      id: "lines:color",
      mark: "lines",
      channel: "color",
      field: color.field,
      scaleId,
      defaultValue: color.value || "#4e79a7",
      encoding: color
    });

    if (color.field && scaleId) {
      artifacts.legends.push(
        makeLegendDescriptor("lines", "color", { ...color, scale: colorScaleConfig }, scaleId, "rows")
      );
    }
  }

  const size = lines.size;
  if (size) {
    const sizeScaleConfig = size?.field
      ? {
          type: "linear",
          range: [1, 7],
          ...(size.scale || {})
        }
      : null;
    const scaleId = size?.field && sizeScaleConfig ? makeScaleId(visType, "lines", "size", size.field) : null;

    if (scaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        scaleId,
        sizeScaleConfig,
        rows,
        size.field,
        false,
        (config, data, field, isColor) => encodingManager.createD3Scale(config, data, field, isColor)
      );
      if (scale) artifacts.scales.set(scaleId, scale);
    }

    artifacts.channels.push({
      id: "lines:size",
      mark: "lines",
      channel: "size",
      field: size.field,
      scaleId,
      defaultValue:
        typeof size.value === "number" && !Number.isNaN(size.value) && size.value > 0
          ? size.value
          : 2,
      encoding: size
    });

    if (size.field && scaleId) {
      artifacts.legends.push(
        makeLegendDescriptor("lines", "size", { ...size, scale: sizeScaleConfig }, scaleId, "rows")
      );
    }
  }

  const hasPointsConfig = Object.prototype.hasOwnProperty.call(encoding, "points");
  const points = encoding.points || {};
  const pointsEnabled = points.display === undefined ? hasPointsConfig : points.display === true;
  if (pointsEnabled) {
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
            : 3,
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
  }

  return artifacts;
}
