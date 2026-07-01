import "@wimmics/venus";
import { EditorApp } from "./src/js/editor-app.js";

window.addEventListener("DOMContentLoaded", async () => {
  const app = new EditorApp();
  await app.init();
});
