import { defineConfig } from "vite";

export default defineConfig({
  base: "/editor/",
  server: {
    port: 5174,
    strictPort: true
  }
});
