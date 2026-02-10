import { extractId, extractLabel } from "../extract-bindings-info.js";

export function addDirectionalLink({
  binding,
  vars,
  sourceId,
  targetVar,
  nodesMap,
  linksMap,
  explicitNodeFieldConfig,
  copyNodeFields
}) {
  if (!binding[targetVar]) return;

  const targetBinding = binding[targetVar];
  const targetId = extractId(targetBinding);

  if (!nodesMap.has(targetId)) {
    const node = {
      id: targetId,
      label: extractLabel(targetBinding, targetVar, binding, vars),
      uri: targetBinding.type === "uri" ? targetBinding.value : null,
      type: targetBinding.type,
      originalData: {}
    };

    copyNodeFields(node, binding, vars, targetVar, explicitNodeFieldConfig);
    nodesMap.set(targetId, node);
  }

  const linkKey = `${sourceId}-${targetId}`;
  if (!linksMap.has(linkKey)) {
    const link = {
      source: sourceId,
      target: targetId,
      type: "directional"
    };

    for (const varName of vars) {
      if (binding[varName]) {
        link[varName] = binding[varName].value;
      }
    }

    linksMap.set(linkKey, link);
  }
}

export function addSemanticLink({
  binding,
  vars,
  sourceId,
  targetVar,
  semanticVar,
  nodesMap,
  linksMap,
  explicitNodeFieldConfig,
  copyNodeFields
}) {
  if (!binding[targetVar]) return;

  const targetBinding = binding[targetVar];
  const targetId = extractId(targetBinding);

  if (!nodesMap.has(targetId)) {
    const node = {
      id: targetId,
      label: extractLabel(targetBinding, targetVar, binding, vars),
      uri: targetBinding.type === "uri" ? targetBinding.value : null,
      type: targetBinding.type,
      originalData: {}
    };

    copyNodeFields(node, binding, vars, targetVar, explicitNodeFieldConfig);
    nodesMap.set(targetId, node);
  }

  const linkKey = `${sourceId}-${targetId}-semantic`;
  if (!linksMap.has(linkKey)) {
    const semanticLabel =
      semanticVar && binding[semanticVar]
        ? binding[semanticVar].value
        : "relation";

    const link = {
      source: sourceId,
      target: targetId,
      type: "semantic",
      semanticLabel,
      tooltip: semanticLabel
    };

    for (const varName of vars) {
      if (binding[varName]) {
        link[varName] = binding[varName].value;
      }
    }

    linksMap.set(linkKey, link);
  }
}

