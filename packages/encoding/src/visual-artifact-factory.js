const registry = new Map();

export function registerVisualArtifactCompiler(visType, compilerFn) {
  if (typeof compilerFn !== "function") {
    throw new Error(`Compiler for "${visType}" must be a function.`);
  }
  registry.set(visType, compilerFn);
}

export function createVisualArtifacts(visType, payload = {}) {
  const compiler = registry.get(visType);
  if (!compiler) {
    throw new Error(
      `No visual artifact compiler registered for "${visType}". Known types: ${[...registry.keys()].join(", ")}`
    );
  }
  return compiler(payload);
}

export function hasVisualArtifactCompiler(visType) {
  return registry.has(visType);
}

export function listVisualArtifactCompilers() {
  return [...registry.keys()].sort();
}

