const TOAST_STACK_ID = "editorToastStack";
const TOAST_TIMEOUT_MS = 5000;
const TOAST_TIMEOUT_ERROR_MS = 4200;
const TOAST_CONTAINER_SELECTOR = "#visualization-pane";

let safeRunDepth = 0
let installedWarn = null
const shownMessages = new Set()

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

function showToast(message, { level = "info" } = {}) {
    if (!message) return;
    
    const stack = getToastStack();
    
    const toast = document.createElement("div");
    toast.className = `editor-toast ${level}`;
    
    const text = document.createElement("span");
    text.textContent = message;
    toast.appendChild(text);
    
    if (level === "error") {
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
    
    stack.querySelectorAll(".editor-toast").forEach(toast => toast.remove());
    
    if (!stack.childElementCount) {
        stack.remove();
    }
}

export function updateStatus(
    message,
    {
        level = "info",
        statusSelector = "#status"
    } = {}
) {
    
    const statusEl = document.querySelector(statusSelector);
    
    if (statusEl) {
        statusEl.textContent = message || "";
        statusEl.classList.toggle("error", level === "error");
    }
    
    showToast(message, { level });
}

export async function safeRun(
    action,
    {
        fallbackMessage,
        statusSelector = "#status"
    } = {}
) {
    const isTopLevel = safeRunDepth === 0;
    
    if (isTopLevel) {
        shownMessages.clear();
        installedWarn = console.warn.bind(console);
        
        console.warn = (...args) => {
            const message = args.map(String).join(" ");
            const key = `warning:${message}`;
            
            if (!shownMessages.has(key)) {
                shownMessages.add(key);
                updateStatus(message, {
                    level: "warning",
                    statusSelector
                });

                installedWarn(...args);
            }
        };
    }
    
    safeRunDepth += 1;
    
    try {
        return await action();
    } catch (error) {
        const message = error?.message || fallbackMessage || "Unexpected error"
        const key = `error:${message}`
        
        if (!shownMessages.has(key)) {
            shownMessages.add(key)
            updateStatus(message, {
                level: "error",
                statusSelector
            })
        }

        updateStatus(
            error?.message || fallbackMessage || "Unexpected error",
            {
                level: "error",
                statusSelector
            }
        );
        
        return null;
    } finally {
        safeRunDepth -= 1;

        if (safeRunDepth === 0 && installedWarn) {
            console.warn = installedWarn
            installedWarn = null
            shownMessages.clear()
        }
    }
}