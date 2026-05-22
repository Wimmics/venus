function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeMissing(target, source) {
  if (!isPlainObject(target) || !isPlainObject(source)) return target;

  for (const [key, sourceValue] of Object.entries(source)) {
    if (!(key in target)) {
      target[key] = clone(sourceValue);
      continue;
    }

    if (isPlainObject(target[key]) && isPlainObject(sourceValue)) {
      mergeMissing(target[key], sourceValue);
    }
  }

  return target;
}

function getContainer(root, path) {
  let cursor = root;
  for (const key of path) {
    if (!isPlainObject(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  return cursor;
}

function removePath(root, path) {
  if (!Array.isArray(path) || path.length === 0) return false;
  let cursor = root;
  for (const key of path.slice(0, -1)) {
    if (!isPlainObject(cursor?.[key])) return false;
    cursor = cursor[key];
  }
  const targetKey = path[path.length - 1];
  if (!(targetKey in cursor)) return false;
  delete cursor[targetKey];
  return true;
}

export function insertEncodingSnippet(encoding, snippet) {
  if (!isPlainObject(encoding)) {
    throw new Error("Encoding JSON must be an object.");
  }
  if (!Array.isArray(snippet?.path) || snippet.path.length === 0) {
    throw new Error("Encoding snippet must define an insertion path.");
  }

  const result = clone(encoding);

  if (snippet.mode === "mergeRoot") {
    const before = JSON.stringify(result);
    mergeMissing(result, snippet.value);
    const changed = before !== JSON.stringify(result);
    return { value: result, changed, status: changed ? "completed" : "present" };
  }

  if (snippet.mode === "remove") {
    const paths = Array.isArray(snippet.paths) ? snippet.paths : [snippet.path];
    let changed = false;
    for (const path of paths) {
      changed = removePath(result, path) || changed;
    }
    return { value: result, changed, status: changed ? "removed" : "present" };
  }

  const path = snippet.path;
  const targetKey = path[path.length - 1];
  const container = getContainer(result, path.slice(0, -1));
  const existingValue = container[targetKey];

  if (snippet.mode === "replace") {
    const nextValue = clone(snippet.value);
    const changed = JSON.stringify(existingValue) !== JSON.stringify(nextValue);
    if (changed) {
      container[targetKey] = nextValue;
    }
    const status =
      !changed
        ? "present"
        : existingValue === undefined
          ? "inserted"
          : "replaced";
    return { value: result, changed, status };
  }

  if (snippet.mode === "replaceLabelsText") {
    const nextValue = isPlainObject(existingValue) ? clone(existingValue) : {};
    delete nextValue.field;
    delete nextValue.value;
    Object.assign(nextValue, clone(snippet.value));
    nextValue.display = true;
    const changed = JSON.stringify(existingValue) !== JSON.stringify(nextValue);
    if (changed) {
      container[targetKey] = nextValue;
    }
    const status =
      !changed
        ? "present"
        : existingValue === undefined
          ? "inserted"
          : "replaced";
    return { value: result, changed, status };
  }

  if (existingValue === undefined) {
    container[targetKey] = clone(snippet.value);
    return { value: result, changed: true, status: "inserted" };
  }

  if (isPlainObject(existingValue) && isPlainObject(snippet.value)) {
    const before = JSON.stringify(existingValue);
    mergeMissing(existingValue, snippet.value);
    const changed = before !== JSON.stringify(existingValue);
    return { value: result, changed, status: changed ? "completed" : "present" };
  }

  return { value: result, changed: false, status: "present" };
}
