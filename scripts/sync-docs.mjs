import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "docs");
const outRoot = path.join(repoRoot, "website", "homepage", "public", "docs");
const manifestPath = path.join(repoRoot, "website", "homepage", "public", "docs-manifest.json");
const configPath = path.join(repoRoot, "docs", "config.json");

function toTitle(name) {
  return name
    .replace(/\.md$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

function upperFirst(text) {
  const value = String(text ?? "").trim();
  if (!value) return value;
  return value[0].toUpperCase() + value.slice(1);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function loadConfig() {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function sortWithOrder(names, preferredOrder = []) {
  const orderMap = new Map(preferredOrder.map((name, index) => [name, index]));
  return [...names].sort((a, b) => {
    const ai = orderMap.has(a) ? orderMap.get(a) : Number.POSITIVE_INFINITY;
    const bi = orderMap.has(b) ? orderMap.get(b) : Number.POSITIVE_INFINITY;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });
}

function basenameFromPath(value) {
  return path.posix.basename(String(value || "").replaceAll("\\", "/"));
}

function normalizeToLocalName(relDir, value) {
  const normalized = String(value || "").replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized) return "";
  if (!relDir) return normalized;

  const relPrefix = `${relDir}/`;
  if (normalized.startsWith(relPrefix)) {
    return normalized.slice(relPrefix.length);
  }
  return normalized;
}

function toConfigItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((entry) => {
      if (typeof entry === "string") return { path: entry };
      if (entry && typeof entry === "object" && typeof entry.path === "string") {
        return { path: entry.path, label: entry.label };
      }
      return null;
    })
    .filter(Boolean);
}

function resolveNodeTitle({ config, relPath, name, isFolder, folderCfg, explicitLabel }) {
  if (typeof explicitLabel === "string" && explicitLabel.trim()) {
    return upperFirst(explicitLabel);
  }

  const fileItems = Array.isArray(folderCfg?.files) ? folderCfg.files : [];
  const matchedFileItem = fileItems.find((item) => item?.path === relPath);
  const byPath = isFolder
    ? config?.folderTitles?.[relPath]
    : matchedFileItem?.label || config?.titles?.[relPath];
  const fallback = toTitle(name);
  return upperFirst(byPath || fallback);
}

async function walk(srcDir, config, relDir = "") {
  const abs = path.join(srcDir, relDir);
  const entries = await fs.readdir(abs, { withFileTypes: true });

  const unorderedDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const unorderedFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name);

  const folderCfg = config?.folders?.[relDir] || {};
  const isRoot = relDir === "";
  const rootFolders = Array.isArray(config?.root?.folders) ? config.root.folders : [];
  const rootItems = toConfigItems(config?.root?.items);
  const folderOrder = isRoot ? rootFolders : (Array.isArray(folderCfg?.folders) ? folderCfg.folders : []);
  const fileItems = Array.isArray(folderCfg?.files) ? folderCfg.files : [];
  const mixedItems = isRoot ? rootItems : toConfigItems(folderCfg?.items);
  const fileOrder = fileItems
    .map((item) => (typeof item?.path === "string" ? item.path : ""))
    .filter(Boolean)
    .map((p) => basenameFromPath(p));

  const folderCfgExists = !isRoot && Object.keys(folderCfg).length > 0;
  const foldersConfigured = isRoot
    ? Array.isArray(config?.root?.folders)
    : folderCfgExists;
  const filesConfigured = folderCfgExists;

  const allowedDirs = foldersConfigured
    ? unorderedDirs.filter((name) => folderOrder.includes(name))
    : unorderedDirs;
  const allowedFiles = filesConfigured
    ? unorderedFiles.filter((name) => fileOrder.includes(name))
    : unorderedFiles;

  const dirs = sortWithOrder(allowedDirs, folderOrder);
  const files = sortWithOrder(allowedFiles, fileOrder);

  const itemOrder = [];
  if (mixedItems.length) {
    const seen = new Set();
    for (const item of mixedItems) {
      const local = normalizeToLocalName(relDir, item.path);
      if (!local || local.includes("/")) continue;
      if (seen.has(local)) continue;

      if (unorderedDirs.includes(local)) {
        itemOrder.push({ type: "folder", name: local, label: item.label });
        seen.add(local);
        continue;
      }
      if (unorderedFiles.includes(local)) {
        itemOrder.push({ type: "file", name: local, label: item.label });
        seen.add(local);
      }
    }
  }

  const children = [];
  let entry = null;

  const orderedNodes = itemOrder.length
    ? itemOrder
    : [
        ...dirs.map((name) => ({ type: "folder", name })),
        ...files.map((name) => ({ type: "file", name }))
      ];

  for (const node of orderedNodes) {
    if (node.type === "folder") {
      const childRel = path.posix.join(relDir, node.name).replaceAll("\\", "/");
      const folderNode = await walk(srcDir, config, childRel);
      children.push({
        type: "folder",
        name: node.name,
        title: resolveNodeTitle({
          config,
          relPath: childRel,
          name: node.name,
          isFolder: true,
          folderCfg,
          explicitLabel: node.label
        }),
        path: childRel,
        entry: folderNode.entry,
        children: folderNode.children
      });
      continue;
    }

    const relFile = path.posix.join(relDir, node.name).replaceAll("\\", "/");
    const srcFile = path.join(srcDir, relFile);
    const outFile = path.join(outRoot, relFile);
    await ensureDir(path.dirname(outFile));
    await fs.copyFile(srcFile, outFile);

    if (node.name.toLowerCase() === "start.md") {
      entry = relFile;
      continue;
    }

    children.push({
      type: "file",
      name: node.name,
      title: resolveNodeTitle({
        config,
        relPath: relFile,
        name: node.name,
        isFolder: false,
        folderCfg,
        explicitLabel: node.label
      }),
      path: relFile
    });
  }

  return { children, entry };
}

async function main() {
  const config = await loadConfig();
  await ensureDir(srcRoot);
  await fs.rm(outRoot, { recursive: true, force: true });
  await ensureDir(outRoot);

  const root = await walk(srcRoot, config, "");

  const manifest = {
    generatedAt: new Date().toISOString(),
    root: {
      type: "folder",
      name: "docs",
      title: upperFirst(config?.root?.title || "Docs"),
      path: "",
      entry: root.entry,
      children: root.children
    }
  };

  await ensureDir(path.dirname(manifestPath));
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
