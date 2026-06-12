import { extractId, resolveBindingLabel } from "../extract-bindings-info.js";
import { addNodeRole, applyNodeLabelField, resolveRoleNodeConfig } from "./node-field-utils.js";

export function addDirectionalLink({
	binding,
	vars,
	sourceId,
	targetVar,
	nodesMap,
	linksMap,
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
			label: resolveBindingLabel(nodeLabel?.labels, targetBinding, binding),
			uri: targetBinding.type === "uri" ? targetBinding.value : null,
			type: targetBinding.type,
			originalData: {}
		};
		
		copyNodeFields(node, binding, vars);
		applyNodeLabelField(node, nodeLabel?.labels);
		nodesMap.set(targetId, node);
	}
	const targetNode = nodesMap.get(targetId);
	addNodeRole(targetNode, "target");
	copyNodeFields(targetNode, binding, vars);
	applyNodeLabelField(targetNode, resolveRoleNodeConfig({ nodes: nodeLabel }, targetNode, "target", "labels"));
	
	const linkKey = `${sourceId}-${targetId}`;
	if (!linksMap.has(linkKey)) {
		const link = {
			source: sourceId,
			target: targetId,
			type: "directional",
			label: resolveBindingLabel(linkLabel, targetBinding, binding)
		};
		
		linksMap.set(linkKey, link);
	}
	mergeLinkBindingValues(linksMap.get(linkKey), binding, vars);
}

export function addSemanticLink({
	binding,
	vars,
	sourceId,
	targetVar,
	semanticVar,
	nodesMap,
	linksMap,
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
			label: resolveBindingLabel(nodeLabel?.labels, targetBinding, binding),
			uri: targetBinding.type === "uri" ? targetBinding.value : null,
			type: targetBinding.type,
			originalData: {}
		};
		
		copyNodeFields(node, binding, vars);
		applyNodeLabelField(node, nodeLabel?.labels);
		nodesMap.set(targetId, node);
	}
	
	const targetNode = nodesMap.get(targetId);
	addNodeRole(targetNode, "target");
	copyNodeFields(targetNode, binding, vars);
	applyNodeLabelField(
		targetNode,
		resolveRoleNodeConfig({ nodes: nodeLabel }, targetNode, "target", "labels")
	);
	
	const semanticBinding = semanticVar ? binding[semanticVar] : null;
	const semanticId = semanticBinding ? extractId(semanticBinding) : "relation";
	const semanticLabel = semanticBinding?.value || "relation";
	
	const linkKey = `${sourceId}-${targetId}-semantic`;
	
	if (!linksMap.has(linkKey)) {
		const link = {
			source: sourceId,
			target: targetId,
			type: "semantic",
			relation: semanticId,
			semanticLabel,
			label: resolveBindingLabel(linkLabel, semanticBinding || targetBinding, binding),
			tooltip: semanticLabel
		};
		
		linksMap.set(linkKey, link);
	}
	
	mergeLinkBindingValues(linksMap.get(linkKey), binding, vars);
}

function mergeLinkBindingValues(link, binding, vars = []) {
	if (!link) return;
	for (const varName of vars) {
		const nextValue = binding?.[varName]?.value;
		if (nextValue === undefined || nextValue === null) continue;
		link[varName] = mergeUniqueValue(link[varName], nextValue);
	}
}

function mergeUniqueValue(currentValue, nextValue) {
	if (currentValue === undefined || currentValue === null) return nextValue;
	if (Array.isArray(currentValue)) {
		return currentValue.includes(nextValue) ? currentValue : [...currentValue, nextValue];
	}
	return currentValue === nextValue ? currentValue : [currentValue, nextValue];
}
