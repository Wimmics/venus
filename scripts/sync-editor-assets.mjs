import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const src = path.join(repoRoot, "examples");
const dst = path.join(repoRoot, "website", "editor", "public", "data", "examples");

await fs.rm(dst, { recursive: true, force: true });
await fs.mkdir(dst, { recursive: true });
await fs.cp(src, dst, { recursive: true });