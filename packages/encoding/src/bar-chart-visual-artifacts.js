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
  visType = VIS_TYPES.VENUS_BARCHART
} = {}) {
  const artifacts = {
    scales: new Map(),
    channels: [],
    legends: []
  };
  if (!encodingManager || !encoding) return artifacts;

  const bars = encoding.bars || {};
  const color = bars.color;
  if (color) {
    const colorScaleConfig = color?.field ? (color.scale || { type: "ordinal", range: "Accent" }) : null;
    const scaleId = color?.field && colorScaleConfig ? makeScaleId(visType, "bars", "color", color.field) : null;

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
      id: "bars:color",
      mark: "bars",
      channel: "color",
      field: color.field,
      scaleId,
      defaultValue: color.value || "#69b3a2",
      encoding: color
    });

    if (color.field && scaleId) {
      artifacts.legends.push(
        makeLegendDescriptor("bars", "color", { ...color, scale: colorScaleConfig }, scaleId, "rows")
      );
    }
  }

  const size = bars.size;
  if (size) {
    const sizeScaleConfig = size?.field
      ? {
          type: "linear",
          range: [0.5, 6],
          ...(size.scale || {})
        }
      : null;
    const scaleId = size?.field && sizeScaleConfig ? makeScaleId(visType, "bars", "size", size.field) : null;

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
      id: "bars:size",
      mark: "bars",
      channel: "size",
      field: size.field,
      scaleId,
      defaultValue:
        typeof size.value === "number" && !Number.isNaN(size.value) && size.value >= 0
          ? size.value
          : 0,
      encoding: size
    });

    if (size.field && scaleId) {
      artifacts.legends.push(
        makeLegendDescriptor("bars", "size", { ...size, scale: sizeScaleConfig }, scaleId, "rows")
      );
    }
  }

  return artifacts;
}
