export async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load JSON at ${path} (${response.status})`);
  }
  return response.json();
}

export async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load query at ${path} (${response.status})`);
  }
  return response.text();
}
