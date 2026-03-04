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
    const scaleId = nodeColor?.field && nodeColor?.scale
      ? makeScaleId(visType, "nodes", "color", nodeColor.field)
      : null;
    if (scaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        scaleId,
        nodeColor.scale,
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
    if (nodeColor.field && nodeColor.scale && scaleId) {
      artifacts.legends.push(makeLegendDescriptor("nodes", "color", nodeColor, scaleId, "nodes"));
    }
  }

  const nodeSize = resolveSingle(encoding.nodes?.size);
  if (nodeSize) {
    const scaleId = nodeSize?.field && nodeSize?.scale
      ? makeScaleId(visType, "nodes", "size", nodeSize.field)
      : null;
    if (scaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        scaleId,
        nodeSize.scale,
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
    if (nodeSize.field && nodeSize.scale && scaleId) {
      artifacts.legends.push(makeLegendDescriptor("nodes", "size", nodeSize, scaleId, "nodes"));
    }
  }

  const linkColor = resolveSingle(encoding.links?.color);
  if (linkColor) {
    const scaleId = linkColor?.field && linkColor?.scale
      ? makeScaleId(visType, "links", "color", linkColor.field)
      : null;
    if (scaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        scaleId,
        linkColor.scale,
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
    if (linkColor.field && linkColor.scale && scaleId) {
      artifacts.legends.push(makeLegendDescriptor("links", "color", linkColor, scaleId, "links"));
    }
  }

  return artifacts;
}
