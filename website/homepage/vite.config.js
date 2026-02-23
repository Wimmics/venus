import { defineConfig } from "vite";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const docsRoot = path.join(repoRoot, "docs");
const syncScript = path.join(repoRoot, "scripts", "sync-docs.mjs");
const runSyncDocs = () =>
  new Promise((resolve, reject) => {
    execFile("node", [syncScript], { cwd: repoRoot }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        usage: path.resolve(__dirname, "usage/index.html"),
        documentation: path.resolve(__dirname, "documentation/index.html")
      }
    }
  },
  plugins: [
    {
      name: "venus-docs-hot-reload",
      configureServer(server) {
        server.watcher.add(docsRoot);

        let pending = false;
        const triggerReload = async () => {
          if (pending) return;
          pending = true;
          try {
            await runSyncDocs();
            server.ws.send({ type: "full-reload" });
          } catch (error) {
            server.config.logger.error(
              `docs sync failed: ${error?.message || error}`
            );
          } finally {
            pending = false;
          }
        };

        const onFileEvent = (file) => {
          if (!file.startsWith(docsRoot)) return;
          void triggerReload();
        };

        server.watcher.on("add", onFileEvent);
        server.watcher.on("change", onFileEvent);
        server.watcher.on("unlink", onFileEvent);
      }
    }
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "^/editor($|/)": {
        target: "http://localhost:5174",
        changeOrigin: true
      }
    }
  }
});
