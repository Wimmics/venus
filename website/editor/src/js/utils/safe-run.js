const TOAST_STACK_ID = "editorToastStack";
const TOAST_TIMEOUT_MS = 2600;
const TOAST_TIMEOUT_ERROR_MS = 4200;

function getToastStack() {
  let stack = document.getElementById(TOAST_STACK_ID);
  if (stack) return stack;

  stack = document.createElement("div");
  stack.id = TOAST_STACK_ID;
  stack.className = "editor-toast-stack";
  document.body.appendChild(stack);
  return stack;
}

function showToast(message, { isError = false } = {}) {
  if (!message || !isError) return;
  const stack = getToastStack();
  const toast = document.createElement("div");
  toast.className = isError ? "editor-toast error" : "editor-toast";
  toast.textContent = message;
  stack.appendChild(toast);

  const ttl = isError ? TOAST_TIMEOUT_ERROR_MS : TOAST_TIMEOUT_MS;
  window.setTimeout(() => {
    toast.remove();
    if (!stack.childElementCount) {
      stack.remove();
    }
  }, ttl);
}

export function updateStatus(message, { isError = false, statusSelector = "#status" } = {}) {
  const statusEl = document.querySelector(statusSelector);
  if (statusEl) {
    statusEl.textContent = message || "";
    statusEl.classList.toggle("error", Boolean(isError));
  }
  showToast(`${message}.\n\nSee the browser console for more details.`, { isError });
  console.log(message)
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
