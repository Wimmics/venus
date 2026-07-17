export async function fetchJson(path, { optional = false } = {}) {
	try {
		const response = await fetch(path);

		if (!response.ok) {
			if (optional) return null;
			throw new Error(`Failed to load JSON at ${path} (${response.status})`);
		}

		return await response.json();
	} catch (error) {
		if (optional) return null;
		throw error;
	}
}

export async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load query at ${path} (${response.status})`);
  }
  return response.text();
}
