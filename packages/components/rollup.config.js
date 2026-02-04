import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

// Only peer deps are external (e.g., d3). Internal @org/* are bundled.
const external = Object.keys(pkg.peerDependencies || {});

export default {
  input: "./index.js",
  external,
  output: {
    file: "dist/index.js",
    format: "esm",
    sourcemap: true
  },
  plugins: [
    resolve({ extensions: [".js", ".mjs", ".json"] }),
    commonjs(),
    terser()
  ]
};
