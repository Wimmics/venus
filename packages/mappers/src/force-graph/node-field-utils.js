export function normalizeNodeFields(nodeFieldConfig, fallbackField) {
  const normalized = Array.isArray(nodeFieldConfig)
    ? nodeFieldConfig.filter((value) => typeof value === "string" && value.trim())
    : [nodeFieldConfig].filter((value) => typeof value === "string" && value.trim());
  if (normalized.length) return normalized;
  return [fallbackField].filter(Boolean);
}

export function inferOwnerVar(fieldName, nodeFields, context = {}) {
  if (typeof fieldName !== "string" || !fieldName.trim()) {
    return context.sourceVar || nodeFields[0] || null;
  }

  for (const nodeField of nodeFields) {
    if (!nodeField) continue;
    if (fieldName === nodeField) return nodeField;
    if (fieldName.startsWith(nodeField)) return nodeField;
    if (fieldName === `${nodeField}Label`) return nodeField;
    if (fieldName === `${nodeField}Name`) return nodeField;
  }

  if (
    (context.linkType === "directional" || context.linkType === "semantic") &&
    typeof context.sourceVar === "string"
  ) {
    return context.sourceVar;
  }
  if (typeof context.sourceVar === "string") return context.sourceVar;
  return nodeFields[0] || null;
}

export function collectExplicitNodeFields(mapping, context = {}) {
  const fields = new Set();
  const ownerByField = new Map();
  const nodeFields = normalizeNodeFields(mapping?.nodes?.field);
  const addOwnedField = (fieldName, ownerVar) => {
    if (typeof fieldName !== "string" || !fieldName.trim() || !ownerVar) return;
    fields.add(fieldName);
    const owners = ownerByField.get(fieldName) || new Set();
    owners.add(ownerVar);
    ownerByField.set(fieldName, owners);
  };

  const nodeColorConfig = mapping?.nodes?.color;
  const nodeColorConfigs = [Array.isArray(nodeColorConfig) ? nodeColorConfig[0] : nodeColorConfig].filter(Boolean);

  for (const config of nodeColorConfigs) {
    if (typeof config?.field === "string" && config.field.trim()) {
      addOwnedField(
        config.field,
        inferOwnerVar(config.field, nodeFields, context)
      );
    }
  }

  const roleColorConfigs = [
    [mapping?.nodes?.source?.color, context.sourceVar],
    [mapping?.nodes?.target?.color, context.targetVar]
  ];
  for (const [config, ownerVar] of roleColorConfigs) {
    if (typeof config?.field === "string" && config.field.trim()) {
      addOwnedField(config.field, ownerVar);
    }
  }

  const roleSizeConfigs = [
    [mapping?.nodes?.source?.size, context.sourceVar],
    [mapping?.nodes?.target?.size, context.targetVar]
  ];
  for (const [config, ownerVar] of roleSizeConfigs) {
    if (typeof config?.field === "string" && config.field.trim()) {
      addOwnedField(config.field, ownerVar);
    }
  }

  const nodeSizeConfig = mapping?.nodes?.size;
  const nodeSizeConfigs = [Array.isArray(nodeSizeConfig) ? nodeSizeConfig[0] : nodeSizeConfig].filter(Boolean);
  for (const config of nodeSizeConfigs) {
    if (typeof config?.field === "string" && config.field.trim()) {
      addOwnedField(
        config.field,
        inferOwnerVar(config.field, nodeFields, context)
      );
    }
  }

  const nodeLabelField = mapping?.nodes?.labels?.field;
  if (typeof nodeLabelField === "string" && nodeLabelField.trim()) {
    addOwnedField(
      nodeLabelField,
      inferOwnerVar(nodeLabelField, nodeFields, context)
    );
  }

  const roleLabelFields = [
    [mapping?.nodes?.source?.labels?.field, context.sourceVar],
    [mapping?.nodes?.target?.labels?.field, context.targetVar]
  ];
  for (const [fieldName, ownerVar] of roleLabelFields) {
    addOwnedField(fieldName, ownerVar);
  }

  const tooltipConfigs = [
    [mapping?.nodes?.tooltip?.fields, null],
    [mapping?.nodes?.source?.tooltip?.fields, context.sourceVar],
    [mapping?.nodes?.target?.tooltip?.fields, context.targetVar]
  ];
  for (const [tooltipFields, ownerVar] of tooltipConfigs) {
    if (!Array.isArray(tooltipFields)) continue;
    for (const fieldName of tooltipFields) {
      addOwnedField(
        fieldName,
        ownerVar || inferOwnerVar(fieldName, nodeFields, context)
      );
    }
  }

  const tooltipTitleFields = [
    [mapping?.nodes?.tooltip?.title?.field, null],
    [mapping?.nodes?.source?.tooltip?.title?.field, context.sourceVar],
    [mapping?.nodes?.target?.tooltip?.title?.field, context.targetVar]
  ];
  for (const [fieldName, ownerVar] of tooltipTitleFields) {
    addOwnedField(
      fieldName,
      ownerVar || inferOwnerVar(fieldName, nodeFields, context)
    );
  }

  return { fields, ownerByField };
}

export function fieldBelongsToEntity(fieldName, entityVarName, explicitNodeFieldConfig) {
  const ownerByField = explicitNodeFieldConfig?.ownerByField;
  if (!(ownerByField instanceof Map)) return false;
  const owners = ownerByField.get(fieldName);
  if (owners instanceof Set) return owners.has(entityVarName);
  return typeof owners === "string" && owners === entityVarName;
}

export function copyRelevantNodeFields(node, binding, vars, entityVarName, explicitNodeFieldConfig = { fields: new Set(), ownerByField: new Map() }) {
  const explicitlyReferencedNodeFields = explicitNodeFieldConfig.fields || new Set();
  const relatedVarNames = vars.filter((varName) => {
    if (varName === entityVarName) return true;
    if (varName.startsWith(entityVarName)) return true;
    if (varName === `${entityVarName}Label`) return true;
    if (varName === `${entityVarName}Name`) return true;
    if (
      explicitlyReferencedNodeFields.has(varName) &&
      fieldBelongsToEntity(varName, entityVarName, explicitNodeFieldConfig)
    ) {
      return true;
    }
    return false;
  });

  for (const varName of relatedVarNames) {
    if (binding[varName]) {
      node[varName] = binding[varName].value;
      node.originalData[varName] = binding[varName];
    }
  }
}

export function applyNodeLabelField(node, labelsConfig) {
  if (typeof labelsConfig?.value === "string") {
    node.label = labelsConfig.value;
    return;
  }

  const labelField =
    labelsConfig &&
    typeof labelsConfig === "object" &&
    typeof labelsConfig.field === "string" &&
    labelsConfig.field.trim()
      ? labelsConfig.field.trim()
      : null;

  if (labelField && node?.[labelField] !== undefined && node[labelField] !== null) {
    node.label = node[labelField];
  }
}

export function resolveRoleNodeConfig(mapping, node, role, property) {
  const roles = Array.isArray(node?.roles) ? node.roles : [];
  if (roles.length === 1 && roles[0] === role && mapping?.nodes?.[role]?.[property] !== undefined) {
    return mapping.nodes[role][property];
  }
  return mapping?.nodes?.[property];
}

export function addNodeRole(node, role) {
  if (!node || (role !== "source" && role !== "target")) return;
  const roles = Array.isArray(node.roles) ? node.roles : [];
  if (!roles.includes(role)) roles.push(role);
  node.roles = roles;
}

export function collectCooccurrenceEntities(binding, nodeVars, extractIdFn) {
  const entities = [];
  const seen = new Set();
  for (const varName of nodeVars) {
    const bindingValue = binding?.[varName];
    if (!bindingValue) continue;
    const id = extractIdFn(bindingValue);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    entities.push({ varName, id });
  }
  return entities;
}
