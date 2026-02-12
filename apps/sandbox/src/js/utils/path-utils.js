export function resolvePath(basePath, relativePath) {
  try {
    return new URL(relativePath, new URL(basePath, window.location.href)).pathname;
  } catch {
    return relativePath;
  }
}
