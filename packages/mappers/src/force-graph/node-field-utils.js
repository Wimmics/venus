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

  if (context.linkType === "directional" && typeof context.sourceVar === "string") {
    return context.sourceVar;
  }
  if (typeof context.sourceVar === "string") return context.sourceVar;
  return nodeFields[0] || null;
}

export function collectExplicitNodeFields(mapping, context = {}) {
  const fields = new Set();
  const ownerByField = new Map();
  const nodeFields = normalizeNodeFields(mapping?.nodes?.field);

  const nodeColorConfig = mapping?.nodes?.color;
  const nodeColorConfigs = [Array.isArray(nodeColorConfig) ? nodeColorConfig[0] : nodeColorConfig].filter(Boolean);

  for (const config of nodeColorConfigs) {
    if (typeof config?.field === "string" && config.field.trim()) {
      fields.add(config.field);
      ownerByField.set(
        config.field,
        inferOwnerVar(config.field, nodeFields, context)
      );
    }
  }

  const nodeSizeConfig = mapping?.nodes?.size;
  const nodeSizeConfigs = [Array.isArray(nodeSizeConfig) ? nodeSizeConfig[0] : nodeSizeConfig].filter(Boolean);
  for (const config of nodeSizeConfigs) {
    if (typeof config?.field === "string" && config.field.trim()) {
      fields.add(config.field);
      ownerByField.set(
        config.field,
        inferOwnerVar(config.field, nodeFields, context)
      );
    }
  }

  return { fields, ownerByField };
}

export function fieldBelongsToEntity(fieldName, entityVarName, explicitNodeFieldConfig) {
  const ownerByField = explicitNodeFieldConfig?.ownerByField;
  if (!(ownerByField instanceof Map)) return false;
  const owner = ownerByField.get(fieldName);
  return typeof owner === "string" && owner === entityVarName;
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

