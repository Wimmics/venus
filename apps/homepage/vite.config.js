import { defineConfig } from "vite";

export default defineConfig({
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
