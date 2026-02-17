export function updateStatus(message, { isError = false, statusSelector = "#status" } = {}) {
  const statusEl = document.querySelector(statusSelector);
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.classList.toggle("error", Boolean(isError));
}

export async function safeRun(action, { fallbackMessage, statusSelector = "#status" } = {}) {
  try {
    return await action();
  } catch (error) {
    console.error(error);
    const message = error?.message || fallbackMessage || "Unexpected error";
    updateStatus(message, { isError: true, statusSelector });
    return null;
  }
}
