function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^\w*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[^\w_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function docPathToId(docPath) {
  return `doc-${docPath.replace(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").toLowerCase()}`;
}

function parseHashState() {
  const hash = window.location.hash.replace(/^#/, "");
  const state = { section: "", anchor: "" };
  if (!hash) return state;

  if (hash.startsWith("doc=")) {
    const docPath = decodeURIComponent(hash.slice(4));
    const root = docPath.split("/")[0] || "";
    state.section = root;
    state.anchor = docPathToId(docPath);
    return state;
  }

  const params = new URLSearchParams(hash);
  state.section = params.get("section") || "";
  state.anchor = params.get("anchor") || "";
  return state;
}

function setHashState(section, anchor = "") {
  const params = new URLSearchParams();
  params.set("section", section);
  if (anchor) params.set("anchor", anchor);
  const nextHash = `#${params.toString()}`;
  if (window.location.hash === nextHash) return;
  window.location.hash = params.toString();
}

function resolveDocLink(currentDocPath, href) {
  if (!href || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("#")) {
    return null;
  }
  if (!href.toLowerCase().endsWith(".md")) return null;

  if (href.startsWith("/")) {
    return href.replace(/^\/+/, "");
  }

  const currentDir = currentDocPath.includes("/")
    ? currentDocPath.slice(0, currentDocPath.lastIndexOf("/"))
    : "";

  const rawParts = `${currentDir}/${href}`.split("/");
  const parts = [];
  for (const part of rawParts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

function stripMarkdownComments(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const kept = [];
  let inCodeFence = false;
  let codeFenceToken = "";
  let inHtmlComment = false;
  let inMarkdownComment = false;

  for (let line of lines) {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const token = fenceMatch[1].slice(0, 3);
      if (!inCodeFence) {
        inCodeFence = true;
        codeFenceToken = token;
      } else if (token === codeFenceToken) {
        inCodeFence = false;
        codeFenceToken = "";
      }
      kept.push(line);
      continue;
    }

    if (inCodeFence) {
      kept.push(line);
      continue;
    }

    // Markdown comment syntax:
    // [//]: # (comment)
    // [comment]: # (comment)
    // [//]: # (
    //   multiline comment
    // )
    const markdownCommentLine = line.match(/^\s*\[(?:\/\/|comment)\]:\s*#\s*\((.*)\)\s*$/);
    if (markdownCommentLine) {
      continue;
    }

    if (!inMarkdownComment && /^\s*\[(?:\/\/|comment)\]:\s*#\s*\(\s*$/.test(line)) {
      inMarkdownComment = true;
      continue;
    }

    if (inMarkdownComment) {
      if (/^\s*\)\s*$/.test(line)) {
        inMarkdownComment = false;
      }
      continue;
    }

    // Remove HTML comments, including multiline blocks.
    let out = "";
    let cursor = 0;
    while (cursor < line.length) {
      if (inHtmlComment) {
        const endIdx = line.indexOf("-->", cursor);
        if (endIdx === -1) {
          cursor = line.length;
        } else {
          inHtmlComment = false;
          cursor = endIdx + 3;
        }
        continue;
      }

      const startIdx = line.indexOf("<!--", cursor);
      if (startIdx === -1) {
        out += line.slice(cursor);
        cursor = line.length;
      } else {
        out += line.slice(cursor, startIdx);
        cursor = startIdx + 4;
        inHtmlComment = true;
      }
    }

    if (out.trim().length > 0) {
      kept.push(out);
    } else if (!inHtmlComment) {
      kept.push("");
    }
  }

  return kept.join("\n");
}

function renderMarkdown(markdown) {
  const lines = stripMarkdownComments(markdown).split("\n");
  const out = [];

  let inCode = false;
  let codeLang = "";
  let codeLines = [];
  const listStack = [];
  let tableRows = [];
  let paragraph = [];

  const isTableLine = (line) => {
    const trimmed = line.trim();
    return trimmed.includes("|") && !trimmed.startsWith("#");
  };

  const isSeparatorRow = (line) => {
    const raw = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    if (!raw) return false;
    const cols = raw.split("|").map((part) => part.trim());
    return cols.every((part) => /^:?-{3,}:?$/.test(part));
  };

  const splitTableRow = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => renderInline(cell.trim()));

  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    const top = listStack.pop();
    if (!top) return;
    if (top.liOpen) out.push("</li>");
    out.push(top.type === "ol" ? "</ol>" : "</ul>");
  };

  const flushList = () => {
    while (listStack.length) closeList();
  };

  const flushCode = () => {
    if (!inCode) return;
    const safeLang = codeLang.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
    const classAttr = safeLang ? ` class="language-${safeLang}"` : "";
    out.push(`<pre class="venus-code-block"><code${classAttr}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines = [];
    codeLang = "";
    inCode = false;
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    if (tableRows.length < 2 || !isSeparatorRow(tableRows[1])) {
      out.push(`<p>${renderInline(tableRows.join(" "))}</p>`);
      tableRows = [];
      return;
    }

    const headers = splitTableRow(tableRows[0]);
    const bodyRows = tableRows.slice(2).map(splitTableRow);

    const thead = `<thead><tr>${headers.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${bodyRows
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
      .join("")}</tbody>`;
    out.push(`<table>${thead}${tbody}</table>`);
    tableRows = [];
  };

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      flushTable();
      if (!inCode) {
        inCode = true;
        codeLang = line.slice(3).trim();
      } else {
        flushCode();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (isTableLine(line)) {
      flushParagraph();
      flushList();
      tableRows.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushTable();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushTable();
      const level = heading[1].length;
      const title = heading[2].trim();
      const id = slugify(title);
      out.push(`<h${level} id="${id}">${renderInline(title)}</h${level}>`);
      continue;
    }

    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      flushTable();
      const indentText = listMatch[1] || "";
      const marker = listMatch[2];
      const itemText = listMatch[3].trim();
      const indent = indentText.replace(/\t/g, "  ").length;
      const nextType = /^\d+\.$/.test(marker) ? "ol" : "ul";

      while (listStack.length && indent < listStack[listStack.length - 1].indent) {
        closeList();
      }

      let top = listStack[listStack.length - 1];

      if (!top || indent > top.indent) {
        out.push(nextType === "ol" ? "<ol>" : "<ul>");
        listStack.push({ type: nextType, indent, liOpen: false });
        top = listStack[listStack.length - 1];
      } else if (top.type !== nextType) {
        closeList();
        out.push(nextType === "ol" ? "<ol>" : "<ul>");
        listStack.push({ type: nextType, indent, liOpen: false });
        top = listStack[listStack.length - 1];
      }

      if (top.liOpen) out.push("</li>");
      out.push(`<li>${renderInline(itemText)}`);
      top.liOpen = true;
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushTable();
  flushCode();

  return out.join("\n");
}

function highlightCodeBlocks(container) {
  const hljs = window.hljs;
  if (!hljs || !container) return;
  container.querySelectorAll("pre code").forEach((block) => {
    if (block.dataset.highlighted === "1") return;
    hljs.highlightElement(block);
    block.dataset.highlighted = "1";
  });
}

function collectDocPaths(node, out = []) {
  if (!node) return out;
  if (node.type === "folder") {
    if (node.entry) out.push(node.entry);
    (node.children || []).forEach((child) => collectDocPaths(child, out));
    return out;
  }
  if (node.type === "file") {
    out.push(node.path);
  }
  return out;
}

function scrollToAnchor(anchorId) {
  if (!anchorId) return;
  const el = document.getElementById(anchorId);
  if (el) el.scrollIntoView();
}

async function loadManifest() {
  const response = await fetch("/docs-manifest.json");
  if (!response.ok) throw new Error("Unable to load docs manifest.");
  return response.json();
}

async function loadDoc(path) {
  const response = await fetch(`/docs/${path}`);
  if (!response.ok) throw new Error(`Unable to load markdown file: ${path}`);
  return response.text();
}

window.addEventListener("DOMContentLoaded", async () => {
  const tocEl = document.getElementById("docsToc");
  const contentEl = document.getElementById("docsContent");

  if (!tocEl || !contentEl) return;

  try {
    const manifest = await loadManifest();
    const rootFolders = (manifest.root?.children || []).filter((child) => child.type === "folder");

    if (!rootFolders.length) {
      contentEl.innerHTML = "<h1>No documentation folders found.</h1>";
      return;
    }

    const findRoot = (section) => rootFolders.find((folder) => folder.name === section);
    const defaultRoot = rootFolders[0];

    const renderToc = (activeRoot, activeAnchor) => {
      tocEl.innerHTML = "";

      const buildNode = (node, rootContext) => {
        const li = document.createElement("li");
        li.className = "docs-tree-item";

        if (node.type === "folder") {
          if (node === rootContext) {
            const rootLink = document.createElement("a");
            rootLink.href = `#section=${encodeURIComponent(node.name)}`;
            rootLink.className = "docs-tree-folder-link";
            if (node.name === activeRoot.name) {
              rootLink.classList.add("is-active");
            }
            rootLink.textContent = node.title;
            rootLink.addEventListener("click", (event) => {
              event.preventDefault();
              const rootAnchor = node.entry ? docPathToId(node.entry) : "";
              void renderSection(node.name, rootAnchor);
            });
            li.appendChild(rootLink);
          } else {
            if (node.entry) {
              const folderLink = document.createElement("a");
              const entryAnchorId = docPathToId(node.entry);
              folderLink.href = `#section=${encodeURIComponent(rootContext.name)}&anchor=${encodeURIComponent(entryAnchorId)}`;
              folderLink.className = "docs-tree-folder-link";
              if (rootContext.name === activeRoot.name && entryAnchorId === activeAnchor) {
                folderLink.classList.add("is-active");
              }
              folderLink.textContent = node.title;
              folderLink.addEventListener("click", (event) => {
                event.preventDefault();
                if (rootContext.name !== activeRoot.name) {
                  void renderSection(rootContext.name, entryAnchorId);
                  return;
                }
                setHashState(activeRoot.name, entryAnchorId);
                scrollToAnchor(entryAnchorId);
                renderToc(activeRoot, entryAnchorId);
              });
              li.appendChild(folderLink);
            } else {
              const folderLabel = document.createElement("div");
              folderLabel.className = "docs-tree-folder";
              folderLabel.textContent = node.title;
              li.appendChild(folderLabel);
            }
          }

          const children = node.children || [];
          if (children.length) {
            const ul = document.createElement("ul");
            ul.className = "docs-tree-list";
            for (const child of children) {
              ul.appendChild(buildNode(child, rootContext));
            }
            li.appendChild(ul);
          }
          return li;
        }

        const fileLink = document.createElement("a");
        const anchorId = docPathToId(node.path);
        fileLink.href = `#section=${encodeURIComponent(rootContext.name)}&anchor=${encodeURIComponent(anchorId)}`;
        fileLink.className = "docs-tree-link";
        if (rootContext.name === activeRoot.name && anchorId === activeAnchor) {
          fileLink.classList.add("is-active");
        }

        const fallbackName = (node.name || node.path.split("/").pop() || node.path).replace(/\.md$/i, "");
        fileLink.textContent = node.title || fallbackName;
        fileLink.addEventListener("click", (event) => {
          event.preventDefault();
          if (rootContext.name !== activeRoot.name) {
            void renderSection(rootContext.name, anchorId);
            return;
          }
          setHashState(activeRoot.name, anchorId);
          scrollToAnchor(anchorId);
          renderToc(activeRoot, anchorId);
        });
        li.appendChild(fileLink);
        return li;
      };

      const ul = document.createElement("ul");
      ul.className = "docs-tree-list";
      for (const root of rootFolders) {
        ul.appendChild(buildNode(root, root));
      }
      tocEl.appendChild(ul);
    };

    const wireDocLinks = (container, currentDocPath, activeRoot) => {
      const anchors = container.querySelectorAll("a[href]");
      anchors.forEach((anchor) => {
        const href = anchor.getAttribute("href") || "";
        const resolved = resolveDocLink(currentDocPath, href);
        if (!resolved) return;

        const targetRoot = resolved.split("/")[0] || activeRoot.name;
        const anchorId = docPathToId(resolved);
        anchor.setAttribute("href", `#section=${encodeURIComponent(targetRoot)}&anchor=${encodeURIComponent(anchorId)}`);
        anchor.addEventListener("click", (event) => {
          event.preventDefault();
          void renderSection(targetRoot, anchorId);
        });
      });
    };

    const renderSection = async (sectionName, anchorId) => {
      const activeRoot = findRoot(sectionName) || defaultRoot;
      const docPaths = collectDocPaths(activeRoot, []);

      contentEl.innerHTML = "";
      for (const docPath of docPaths) {
        const markdown = await loadDoc(docPath);
        const sectionEl = document.createElement("section");
        sectionEl.className = "docs-section";
        sectionEl.id = docPathToId(docPath);
        sectionEl.innerHTML = renderMarkdown(markdown);
        wireDocLinks(sectionEl, docPath, activeRoot);
        contentEl.appendChild(sectionEl);
      }
      highlightCodeBlocks(contentEl);

      setHashState(activeRoot.name, anchorId || "");
      renderToc(activeRoot, anchorId || "");
      if (anchorId) {
        scrollToAnchor(anchorId);
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    };

    const initState = parseHashState();
    await renderSection(initState.section || defaultRoot.name, initState.anchor || "");

    window.addEventListener("hashchange", async () => {
      const state = parseHashState();
      await renderSection(state.section || defaultRoot.name, state.anchor || "");
    });
  } catch (error) {
    contentEl.innerHTML = `<h1>Documentation unavailable</h1><p>${escapeHtml(error.message)}</p>`;
    console.error(error);
  }
});
