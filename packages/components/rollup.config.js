import path from "node:path";
import { fileURLToPath } from "node:url";

import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import { string } from "rollup-plugin-string";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

const external = Object.keys(pkg.peerDependencies || {});

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust the relative path if your sparql package is not at ../sparql
const rqInSparqlPackage = path.resolve(__dirname, "../import/queries/**/*.rq");
const rqLocalToo = path.resolve(__dirname, "src/**/*.rq"); // optional, if you ever add rq files locally

const jsonModules = () => ({
  name: "json-modules",
  transform(code, id) {
    if (!id.endsWith(".json")) return null;

    return {
      code: `export default ${code.trim()};`,
      map: { mappings: "" }
    };
  }
});

export default {
  input: "./index.js",
  external,
  output: {
    file: "dist/index.js",
    format: "esm",
    sourcemap: true
  },
  plugins: [
    // Must run before resolve/commonjs
    string({ include: [rqInSparqlPackage, rqLocalToo] }),
    jsonModules(),
    resolve({ extensions: [".js", ".mjs", ".json"] }),
    commonjs(),
    terser()
  ]
};
