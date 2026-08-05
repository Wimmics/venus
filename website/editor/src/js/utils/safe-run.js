const TOAST_STACK_ID = "editorToastStack";
const TOAST_TIMEOUT_MS = 2600;
const TOAST_TIMEOUT_ERROR_MS = 4200;
const TOAST_CONTAINER_SELECTOR = "#visualization-pane";

function getToastStack() {
	let stack = document.getElementById(TOAST_STACK_ID);
	if (stack) return stack;
	
	const container = document.querySelector(TOAST_CONTAINER_SELECTOR);
	
	stack = document.createElement("div");
	stack.id = TOAST_STACK_ID;
	stack.className = "editor-toast-stack";
	
	(container ?? document.body).appendChild(stack);
	
	return stack;
}

function showToast(message, { isError = false } = {}) {
    if (!message) return;

    const stack = getToastStack();

    const toast = document.createElement("div");
    toast.className = isError ? "editor-toast error" : "editor-toast";

    const text = document.createElement("span");
    text.textContent = message;

    toast.appendChild(text);

    if (isError) {
        const close = document.createElement("button");
        close.className = "editor-toast-close";
        close.innerHTML = "&times;";
        close.setAttribute("aria-label", "Close");

        close.addEventListener("click", () => {
            toast.remove();

            if (!stack.childElementCount) {
                stack.remove();
            }
        });

        toast.appendChild(close);
    } else {
        window.setTimeout(() => {
            toast.remove();

            if (!stack.childElementCount) {
                stack.remove();
            }
        }, TOAST_TIMEOUT_MS);
    }

    stack.appendChild(toast);
}

export function clearErrorToasts() {
    const stack = document.getElementById(TOAST_STACK_ID);
    if (!stack) return;

    stack.querySelectorAll(".editor-toast.error").forEach(toast => toast.remove());

    if (!stack.childElementCount) {
        stack.remove();
    }
}

export function updateStatus(message, { isError = false, statusSelector = "#status" } = {}) {
	const statusEl = document.querySelector(statusSelector);
	
	if (statusEl) {
		statusEl.textContent = message || "";
		statusEl.classList.toggle("error", Boolean(isError));
	}

	showToast(`${message}.`, { isError });
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
