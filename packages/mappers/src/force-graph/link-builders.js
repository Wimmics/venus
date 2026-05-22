import { extractId, resolveBindingLabel } from "../extract-bindings-info.js";
import { addNodeRole, applyNodeLabelField, resolveRoleNodeConfig } from "./node-field-utils.js";

export function addDirectionalLink({
  binding,
  vars,
  sourceId,
  targetVar,
  nodesMap,
  linksMap,
  explicitNodeFieldConfig,
  copyNodeFields,
  nodeLabel,
  linkLabel
}) {
  if (!binding[targetVar]) return;

  const targetBinding = binding[targetVar];
  const targetId = extractId(targetBinding);

  if (!nodesMap.has(targetId)) {
    const node = {
      id: targetId,
      label: resolveBindingLabel(typeof nodeLabel?.label === "string" ? nodeLabel.label : null, targetBinding, binding),
      uri: targetBinding.type === "uri" ? targetBinding.value : null,
      type: targetBinding.type,
      originalData: {}
    };

    copyNodeFields(node, binding, vars, targetVar, explicitNodeFieldConfig);
    applyNodeLabelField(node, nodeLabel?.label);
    nodesMap.set(targetId, node);
  }
  const targetNode = nodesMap.get(targetId);
  addNodeRole(targetNode, "target");
  copyNodeFields(targetNode, binding, vars, targetVar, explicitNodeFieldConfig);
  applyNodeLabelField(targetNode, resolveRoleNodeConfig({ nodes: nodeLabel }, targetNode, "target", "label"));

  const linkKey = `${sourceId}-${targetId}`;
  if (!linksMap.has(linkKey)) {
    const link = {
      source: sourceId,
      target: targetId,
      type: "directional",
      label: resolveBindingLabel(linkLabel, targetBinding, binding)
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
  copyNodeFields,
  nodeLabel,
  linkLabel
}) {
  if (!binding[targetVar]) return;

  const targetBinding = binding[targetVar];
  const targetId = extractId(targetBinding);

  if (!nodesMap.has(targetId)) {
    const node = {
      id: targetId,
      label: resolveBindingLabel(typeof nodeLabel?.label === "string" ? nodeLabel.label : null, targetBinding, binding),
      uri: targetBinding.type === "uri" ? targetBinding.value : null,
      type: targetBinding.type,
      originalData: {}
    };

    copyNodeFields(node, binding, vars, targetVar, explicitNodeFieldConfig);
    applyNodeLabelField(node, nodeLabel?.label);
    nodesMap.set(targetId, node);
  }
  const targetNode = nodesMap.get(targetId);
  addNodeRole(targetNode, "target");
  copyNodeFields(targetNode, binding, vars, targetVar, explicitNodeFieldConfig);
  applyNodeLabelField(targetNode, resolveRoleNodeConfig({ nodes: nodeLabel }, targetNode, "target", "label"));

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
      label: resolveBindingLabel(linkLabel, binding[semanticVar] || targetBinding, binding),
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
