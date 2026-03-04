import { VIS_TYPES } from "@wimmics/venus-core";

function resolveSingle(config) {
  return Array.isArray(config) ? config[0] : config;
}

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

export function createForceGraphVisualArtifacts({
  encodingManager,
  encoding,
  nodes = [],
  links = [],
  visType = VIS_TYPES.VENUS_GRAPH
} = {}) {
  const artifacts = {
    scales: new Map(),
    channels: [],
    legends: []
  };

  if (!encodingManager || !encoding) return artifacts;

  const nodeColor = resolveSingle(encoding.nodes?.color);
  if (nodeColor) {
    const nodeColorScaleConfig = nodeColor?.field ? (nodeColor.scale || { type: "ordinal", range: "Accent" }) : null;
    const scaleId = nodeColor?.field && nodeColorScaleConfig
      ? makeScaleId(visType, "nodes", "color", nodeColor.field)
      : null;
    if (scaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        scaleId,
        nodeColorScaleConfig,
        nodes,
        nodeColor.field,
        true,
        (config, data, field, isColor) =>
          encodingManager.createD3Scale(config, data, field, isColor)
      );
      if (scale) artifacts.scales.set(scaleId, scale);
    }
    artifacts.channels.push({
      id: "nodes:color",
      mark: "nodes",
      channel: "color",
      field: nodeColor.field,
      scaleId,
      defaultValue: nodeColor.value || "#cccccc",
      encoding: nodeColor
    });
    if (nodeColor.field && scaleId) {
      artifacts.legends.push(
        makeLegendDescriptor("nodes", "color", { ...nodeColor, scale: nodeColorScaleConfig }, scaleId, "nodes")
      );
    }
  }

  const nodeSize = resolveSingle(encoding.nodes?.size);
  if (nodeSize) {
    const nodeSizeScaleConfig = nodeSize?.field
      ? {
          type: "linear",
          range: [8, 25],
          ...(nodeSize.scale || {})
        }
      : null;
    const scaleId = nodeSize?.field && nodeSizeScaleConfig
      ? makeScaleId(visType, "nodes", "size", nodeSize.field)
      : null;
    if (scaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        scaleId,
        nodeSizeScaleConfig,
        nodes,
        nodeSize.field,
        false,
        (config, data, field, isColor) =>
          encodingManager.createD3Scale(config, data, field, isColor)
      );
      if (scale) artifacts.scales.set(scaleId, scale);
    }
    artifacts.channels.push({
      id: "nodes:size",
      mark: "nodes",
      channel: "size",
      field: nodeSize.field,
      scaleId,
      defaultValue:
        typeof nodeSize.value === "number" && !Number.isNaN(nodeSize.value) && nodeSize.value > 0
          ? nodeSize.value
          : 10,
      encoding: nodeSize
    });
    if (nodeSize.field && scaleId) {
      artifacts.legends.push(
        makeLegendDescriptor("nodes", "size", { ...nodeSize, scale: nodeSizeScaleConfig }, scaleId, "nodes")
      );
    }
  }

  const linkColor = resolveSingle(encoding.links?.color);
  if (linkColor) {
    const linkColorScaleConfig = linkColor?.field ? (linkColor.scale || { type: "ordinal", range: "Accent" }) : null;
    const scaleId = linkColor?.field && linkColorScaleConfig
      ? makeScaleId(visType, "links", "color", linkColor.field)
      : null;
    if (scaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        scaleId,
        linkColorScaleConfig,
        links,
        linkColor.field,
        true,
        (config, data, field, isColor) =>
          encodingManager.createD3Scale(config, data, field, isColor)
      );
      if (scale) artifacts.scales.set(scaleId, scale);
    }
    artifacts.channels.push({
      id: "links:color",
      mark: "links",
      channel: "color",
      field: linkColor.field,
      scaleId,
      defaultValue: linkColor.value || "#999",
      encoding: linkColor
    });
    if (linkColor.field && scaleId) {
      artifacts.legends.push(
        makeLegendDescriptor("links", "color", { ...linkColor, scale: linkColorScaleConfig }, scaleId, "links")
      );
    }
  }

  return artifacts;
}
