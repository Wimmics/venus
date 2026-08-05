import { defineConfig } from "vite";

export default defineConfig({
	base: process.env.VITE_BASE_PATH || "/editor/",
	server: {
		port: 5174,
		strictPort: true
	}
});
