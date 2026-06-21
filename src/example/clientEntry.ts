/**
 * Optional client entry for mini apps (not loaded in this Admin demo).
 * In production, LCDN serves this at apps/demo-menu/client.js
 *
 * Snapshot HTML already contains content tags; this only adds interactivity.
 */
import { createSSRApp } from "vue";
import MenuApp from "./MenuApp.vue";

const stateEl = document.getElementById("cms-state");
if (!stateEl?.textContent) {
  throw new Error("Missing #cms-state");
}

const cms = JSON.parse(stateEl.textContent);
const app = createSSRApp(MenuApp, { cms });
app.mount("#app");
