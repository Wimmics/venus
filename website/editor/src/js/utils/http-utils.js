export async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load JSON at ${path} (${response.status})`);
  }
  return response.json();
}

export async function fetchJsonIfAvailable(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load query at ${path} (${response.status})`);
  }
  return response.text();
}
