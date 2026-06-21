import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import MenuApp from "../example/MenuApp.vue";
import { exampleMenuCms, type MenuCmsData } from "../example/cmsData";

/** Where framework ESM + app entry resolve — LCDN preview vs reversed CDN publish. */
export type RenderContext = "preview" | "publish";

export interface DocumentUrls {
  /** Base for npm-style module URLs, e.g. LCDN /cdn or bucket /cdn */
  moduleBase: string;
  /** Optional app entry module (client enhancement) */
  appEntry: string;
}

const URLS: Record<RenderContext, DocumentUrls> = {
  preview: {
    moduleBase: "http://127.0.0.1:8787/cdn",
    appEntry: "http://127.0.0.1:8787/apps/demo-menu/client.js",
  },
  publish: {
    moduleBase: "https://my-bucket.example.com/cdn",
    appEntry: "https://my-bucket.example.com/apps/demo-menu/client.js",
  },
};

/**
 * What `renderToString` returns: **only** the root component's markup.
 * It is NOT a document. No <html>, no <head>, no scripts, no scoped CSS.
 */
export async function renderAppMarkup(cms: MenuCmsData): Promise<string> {
  const app = createSSRApp(MenuApp, { cms });
  return await renderToString(app);
}

/**
 * Full export artifact: document shell + inlined CMS state + optional client ESM.
 * This is what LCDN stores / reversed CDN uploads.
 */
export async function buildFullDocument(
  context: RenderContext,
  cms: MenuCmsData = exampleMenuCms,
): Promise<string> {
  const innerHtml = await renderAppMarkup(cms);
  const { moduleBase, appEntry } = URLS[context];
  const cmsJson = JSON.stringify(cms);
  const title = cms.restaurantName;

  // import map: bare "vue" → LCDN/bucket resolver URL (preview vs publish differ)
  const importMap = JSON.stringify({
    imports: {
      vue: `${moduleBase}/npm/vue@3/dist/vue.esm-browser.js`,
    },
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <!-- Framework CSS would also come through moduleBase in a real template -->
</head>
<body>
  <div id="app">${innerHtml}</div>
  <script type="application/json" id="cms-state">${cmsJson}</script>
  <script type="importmap">${importMap}</script>
  <script type="module" src="${appEntry}"></script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
