const BASE_URL = import.meta.env.BASE_URL || "/";

function withBase(inputPath) {
  const raw = String(inputPath || "");
  if (!raw || /^https?:\/\//i.test(raw) || raw.startsWith("#")) return raw;
  if (raw.startsWith(BASE_URL)) return raw;
  const cleanBase = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
  const cleanPath = raw.replace(/^\/+/, "");
  return `${cleanBase}${cleanPath}`;
}

function rewriteRootRelativeUrls(scope = document) {
  scope.querySelectorAll('[href^="/"]').forEach((el) => {
    const href = el.getAttribute("href");
    if (!href || href.startsWith("//")) return;
    el.setAttribute("href", withBase(href));
  });
  scope.querySelectorAll('[src^="/"]').forEach((el) => {
    const src = el.getAttribute("src");
    if (!src || src.startsWith("//")) return;
    el.setAttribute("src", withBase(src));
  });
}

async function includePartials() {
  const includeTargets = document.querySelectorAll("[data-include]");

  for (const target of includeTargets) {
    const path = target.getAttribute("data-include");
    if (!path) continue;

    try {
      const response = await fetch(withBase(path));
      if (!response.ok) throw new Error(`Failed to load ${path}`);
      target.innerHTML = await response.text();
      rewriteRootRelativeUrls(target);
    } catch (error) {
      target.innerHTML = `<div class=\"w3-panel w3-pale-red w3-border\">Could not load section: ${path}</div>`;
      console.error(error);
    }
  }
}

function setupMobileMenu() {
  const menuButton = document.getElementById("mobileMenuButton");
  const mobileNav = document.getElementById("mobileNav");
  if (!menuButton || !mobileNav) return;

  menuButton.addEventListener("click", () => {
    mobileNav.classList.toggle("w3-show");
  });
}

function markActivePage() {
  const page = document.body.dataset.page;
  if (!page) return;

  document.querySelectorAll(".nav-link").forEach((el) => {
    const active = el.getAttribute("data-page") === page;
    el.classList.toggle("w3-white", active);
    if (!active) {
      el.classList.add("w3-hover-white");
    }
  });
}

function highlightCodeBlocks() {
  const hljs = window.hljs;
  if (!hljs) return;

  document.querySelectorAll(".venus-code-block code").forEach((block) => {
    if (block.dataset.highlighted === "1") return;
    hljs.highlightElement(block);
    block.dataset.highlighted = "1";
  });
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function enhanceCodeBlocks() {
  document.querySelectorAll(".venus-code-block").forEach((pre) => {
    if (pre.dataset.copyReady === "1") return;
    const code = pre.querySelector("code");
    if (!code) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "venus-copy-button";
    button.setAttribute("aria-label", "Copy code to clipboard");
    button.innerHTML = '<i class="fa fa-copy" aria-hidden="true"></i>';

    button.addEventListener("click", async () => {
      try {
        await copyTextToClipboard(code.textContent || "");
        button.classList.add("is-copied");
        button.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i>';
        setTimeout(() => {
          button.classList.remove("is-copied");
          button.innerHTML = '<i class="fa fa-copy" aria-hidden="true"></i>';
        }, 1200);
      } catch (error) {
        console.error("Failed to copy code block", error);
      }
    });

    pre.appendChild(button);
    pre.dataset.copyReady = "1";
  });
}

function watchCodeBlocks() {
  const observer = new MutationObserver(() => {
    highlightCodeBlocks();
    enhanceCodeBlocks();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

window.addEventListener("DOMContentLoaded", async () => {
  rewriteRootRelativeUrls(document);
  await includePartials();
  markActivePage();
  setupMobileMenu();
  highlightCodeBlocks();
  enhanceCodeBlocks();
  watchCodeBlocks();
});
