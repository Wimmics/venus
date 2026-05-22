import { VIS_TYPES } from "@wimmics/venus-core";

function resolveSingle(config) {
  return Array.isArray(config) ? config[0] : config;
}

function makeScaleId(visType, mark, channel, field, role = null) {
  return `${visType}:${mark}${role ? `:${role}` : ""}:${channel}:${field || "value"}`;
}

function makeLegendDescriptor(mark, channel, encoding, scaleId, dataKey, field) {
  const legend = encoding?.legend || {};
  const display = legend.display !== false;
  const title =
    typeof legend.title === "string" && legend.title.trim()
      ? legend.title
      : field || encoding?.field || encoding?.metric || "Legend";
  const position =
    typeof legend.position === "string" && legend.position.trim()
      ? legend.position
      : "bottom";
  return {
    id: `${mark}:${channel}:${field || encoding?.field || encoding?.metric || "value"}`,
    type: channel,
    mark,
    channel,
    field: field || encoding?.field,
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

  const generalNodeColor = resolveSingle(encoding.nodes?.color);
  const compileNodeColor = (nodeColor, role = null) => {
    if (!nodeColor) return;
    const nodeColorKey = encodingManager.resolveNodeChannelDataKey(nodeColor);
    const nodeColorScaleConfig = nodeColorKey
      ? (
          nodeColor.metric
            ? { type: "sequential", ...(nodeColor.scale || {}) }
            : (nodeColor.scale || { type: "ordinal", range: "Accent" })
        )
      : null;
    const scaleId = nodeColorKey && nodeColorScaleConfig
      ? makeScaleId(visType, "nodes", "color", nodeColorKey, role)
      : null;
    const colorNodes = role
      ? nodes.filter((node) => Array.isArray(node?.roles) && node.roles.includes(role))
      : nodes;
    if (scaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        scaleId,
        nodeColorScaleConfig,
        colorNodes,
        nodeColorKey,
        true,
        (config, data, field, isColor) =>
          encodingManager.createD3Scale(config, data, field, isColor)
      );
      if (scale) artifacts.scales.set(scaleId, scale);
    }
    artifacts.channels.push({
      id: role ? `nodes:${role}:color` : "nodes:color",
      mark: "nodes",
      role,
      channel: "color",
      field: nodeColorKey,
      scaleId,
      defaultValue: nodeColor.value || generalNodeColor?.value || "#cccccc",
      encoding: nodeColor
    });
    if (nodeColorKey && scaleId) {
      artifacts.legends.push(
        makeLegendDescriptor(
          role ? `nodes.${role}` : "nodes",
          "color",
          { ...nodeColor, scale: nodeColorScaleConfig },
          scaleId,
          "nodes",
          nodeColorKey
        )
      );
    }
  };

  compileNodeColor(generalNodeColor);
  compileNodeColor(resolveSingle(encoding.nodes?.source?.color), "source");
  compileNodeColor(resolveSingle(encoding.nodes?.target?.color), "target");

  const generalNodeSize = resolveSingle(encoding.nodes?.size);
  const compileNodeSize = (nodeSize, role = null) => {
    if (!nodeSize) return;
    const nodeSizeKey = encodingManager.resolveNodeChannelDataKey(nodeSize);
    const nodeSizeScaleConfig = nodeSizeKey
      ? {
          type: "linear",
          range: [8, 25],
          ...(nodeSize.scale || {})
        }
      : null;
    const scaleId = nodeSizeKey && nodeSizeScaleConfig
      ? makeScaleId(visType, "nodes", "size", nodeSizeKey, role)
      : null;
    const sizeNodes = role
      ? nodes.filter((node) => Array.isArray(node?.roles) && node.roles.includes(role))
      : nodes;
    if (scaleId) {
      const scale = encodingManager.getOrCreateD3Scale(
        scaleId,
        nodeSizeScaleConfig,
        sizeNodes,
        nodeSizeKey,
        false,
        (config, data, field, isColor) =>
          encodingManager.createD3Scale(config, data, field, isColor)
      );
      if (scale) artifacts.scales.set(scaleId, scale);
    }
    artifacts.channels.push({
      id: role ? `nodes:${role}:size` : "nodes:size",
      mark: "nodes",
      role,
      channel: "size",
      field: nodeSizeKey,
      scaleId,
      defaultValue:
        typeof nodeSize.value === "number" && !Number.isNaN(nodeSize.value) && nodeSize.value > 0
          ? nodeSize.value
          : (
              typeof generalNodeSize?.value === "number" &&
              !Number.isNaN(generalNodeSize.value) &&
              generalNodeSize.value > 0
                ? generalNodeSize.value
                : 10
            ),
      encoding: nodeSize
    });
    if (nodeSizeKey && scaleId) {
      artifacts.legends.push(
        makeLegendDescriptor(
          role ? `nodes.${role}` : "nodes",
          "size",
          { ...nodeSize, scale: nodeSizeScaleConfig },
          scaleId,
          "nodes",
          nodeSizeKey
        )
      );
    }
  };

  compileNodeSize(generalNodeSize);
  compileNodeSize(resolveSingle(encoding.nodes?.source?.size), "source");
  compileNodeSize(resolveSingle(encoding.nodes?.target?.size), "target");

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
