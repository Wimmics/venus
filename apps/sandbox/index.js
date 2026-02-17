import "@wimmics/venus-webcomponents";
import { SandboxApp } from "./src/js/sandbox-app.js";

window.addEventListener("DOMContentLoaded", async () => {
  const app = new SandboxApp();
  await app.init();
});
